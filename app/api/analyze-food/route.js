import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import sharp from "sharp";
import { createHash } from "crypto";

import { db, isDatabaseConfigured } from "@/config/db";
import { meals } from "@/db/schema";
import { eq, and, gte, count } from "drizzle-orm";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const OPENROUTER_TIMEOUT_MS = 45_000;

// Simple in-memory cache for normalized AI results keyed by image SHA256.
// This cache is per-process (non-persistent) and is intended to avoid
// re-calling the AI for identical images submitted repeatedly in a short
// time window. It is safe because cached entries contain the final normalized
// result only (no user-identifying data).
const IMAGE_RESULT_CACHE = new Map();
const FALLBACK_MODEL = "google/gemini-2.5-flash";
const PROVIDER_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
]);

// ── Rate limit constants ────────────────────────────────────────────────────
const ANALYSIS_LIMIT = 3;
const ANALYSIS_WINDOW_MS = 5 * 60 * 60 * 1000; // 5 hours

// ── System prompt (trimmed for lower token usage) ───────────────────────────
// Kept the essential instructions: language rules, required JSON schema and
// the key estimation objectives. The long food examples and extra prose were
// removed to reduce token count while preserving behavioral constraints.
const SYSTEM_PROMPT = `
You are Luqmati (لقمتي), an AI assistant that analyzes food images and
returns a concise JSON nutrition summary tailored for Egyptian users.

Language rules:
- Support Arabic (Egyptian colloquial) and English names. Use simple Egyptian
  Arabic for Arabic output. Keep internal JSON field names in English.

Task:
- Identify the dish and ingredients visible in the image.
- Estimate portion size, calories, protein, carbs, and fats.
- If uncertain, lower the confidence (high|medium|low).

Output requirements:
- Return only valid JSON (no Markdown, no code fences, no extra text).
- Use this structure (exact keys expected):
{
  "foodName": "",
  "foodNameArabic": "",
  "descriptionArabic": "",
  "portion": { "size": "", "estimatedGrams": 0 },
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fats": 0,
  "proteinNote": "",
  "ingredients": [ { "name": "", "nameArabic": "", "estimatedGrams": 0, "calories": 0, "protein": 0, "carbs": 0, "fats": 0 } ],
  "confidence": "high"
}

Keep responses concise and focused on the JSON output.
`;

// Helper to call OpenRouter API
function detectImageType(bytes) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }

  if (
    bytes.length >= 6 &&
    ["GIF87a", "GIF89a"].includes(String.fromCharCode(...bytes.slice(0, 6)))
  ) {
    return "image/gif";
  }

  // HEIC/HEIF files use an ISO Base Media File Format container. They must be
  // converted before they reach OpenRouter, which accepts jpeg/png/webp/gif.
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp") {
    const brand = String.fromCharCode(...bytes.slice(8, 12));
    if (["heic", "heix", "hevc", "hevx", "mif1", "msf1"].includes(brand)) {
      return "image/heic";
    }
  }

  return null;
}

function getAssistantText(content) {
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .filter((part) => typeof part?.text === "string")
      .map((part) => part.text)
      .join("\n")
      .trim();
  }
  return "";
}

function extractJson(text) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  let start = -1;
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = 0; i < cleaned.length; i += 1) {
    const char = cleaned[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") {
      if (start === -1) start = i;
      depth += 1;
    } else if (char === "}" && start !== -1) {
      depth -= 1;
      if (depth === 0) return cleaned.slice(start, i + 1);
    }
  }

  return cleaned;
}

async function normalizeImageForOpenRouter(sourceBuffer, detectedMimeType) {
  const supported = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/heif"]);
  if (!supported.has(detectedMimeType || "")) {
    throw new Error("Unsupported image type");
  }

  const normalized = await sharp(Buffer.from(sourceBuffer))
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true, progressive: true })
    .toBuffer();

  return { mimeType: "image/jpeg", buffer: normalized };
}

function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function normalizeResult(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    throw new Error("AI response was not an object");
  }

  return {
    foodName: String(result.foodName || "Unknown").slice(0, 160),
    foodNameArabic: result.foodNameArabic ? String(result.foodNameArabic).slice(0, 160) : "",
    descriptionArabic: result.descriptionArabic ? String(result.descriptionArabic).slice(0, 500) : "",
    portion: {
      size: result.portion?.size ? String(result.portion.size).slice(0, 80) : "",
      estimatedGrams: Math.max(0, Math.round(finiteNumber(result.portion?.estimatedGrams))),
    },
    calories: Math.max(0, Math.round(finiteNumber(result.calories))),
    protein: Math.max(0, finiteNumber(result.protein)),
    carbs: Math.max(0, finiteNumber(result.carbs)),
    fats: Math.max(0, finiteNumber(result.fats)),
    proteinNote: result.proteinNote ? String(result.proteinNote).slice(0, 500) : "",
    ingredients: Array.isArray(result.ingredients)
      ? result.ingredients.slice(0, 40).map((ingredient) => ({
          name: String(ingredient?.name || "Unknown").slice(0, 120),
          nameArabic: ingredient?.nameArabic ? String(ingredient.nameArabic).slice(0, 120) : "",
          estimatedGrams: Math.max(0, Math.round(finiteNumber(ingredient?.estimatedGrams))),
          calories: Math.max(0, Math.round(finiteNumber(ingredient?.calories))),
          protein: Math.max(0, finiteNumber(ingredient?.protein)),
          carbs: Math.max(0, finiteNumber(ingredient?.carbs)),
          fats: Math.max(0, finiteNumber(ingredient?.fats)),
        }))
      : [],
    confidence: ["high", "medium", "low"].includes(result.confidence)
      ? result.confidence
      : "low",
  };
}

async function callOpenRouter(apiKey, model, mimeType, base64) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);

  try {
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://luqmati.app",
          "X-Title": "Luqmati",
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content: SYSTEM_PROMPT,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "حلل الطبق ده حسب تعليمات Luqmati.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64}`,
                  },
                },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 700,
        }),
      }
    );
    const rawText = await response.text();
    let data = null;
    try {
      data = JSON.parse(rawText);
    } catch {
      // Keep the raw response for diagnostics without returning it to users.
    }
    return { response, data, rawText };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(req) {
  try {
    // ── 1. Database check ────────────────────────────────────────────────────
    if (!isDatabaseConfigured || !db) {
      return NextResponse.json(
        { error: "قاعدة البيانات غير متاحة حاليًا. حاول تاني بعد شوية." },
        { status: 503 }
      );
    }

    // ── 2. Authentication ────────────────────────────────────────────────────
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "لازم تعمل تسجيل دخول الأول." },
        { status: 401 }
      );
    }

    // ── 3. Server-side rate limit ────────────────────────────────────────────
    const windowStart = new Date(Date.now() - ANALYSIS_WINDOW_MS);

    let recentCount;
    try {
      const [{ value }] = await db
        .select({ value: count() })
        .from(meals)
        .where(
          and(
            eq(meals.userId, userId),
            gte(meals.createdAt, windowStart)
          )
        );
      recentCount = Number(value) || 0;
    } catch (databaseError) {
      console.error("[Luqmati] Analysis rate-limit query failed:", databaseError);
      return NextResponse.json(
        { error: "تخزين الوجبات غير متاح حاليًا. حاول تاني بعد شوية." },
        { status: 503 }
      );
    }

    if (recentCount >= ANALYSIS_LIMIT) {
      const oldest = await db
        .select({ createdAt: meals.createdAt })
        .from(meals)
        .where(
          and(
            eq(meals.userId, userId),
            gte(meals.createdAt, windowStart)
          )
        )
        .orderBy(meals.createdAt)
        .limit(1);

      const resetAt = oldest.length > 0
        ? new Date(oldest[0].createdAt.getTime() + ANALYSIS_WINDOW_MS)
        : new Date(Date.now() + ANALYSIS_WINDOW_MS);

      return NextResponse.json(
        {
          error: "وصلت للحد المسموح من التحليلات (3 تحليلات كل 5 ساعات).",
          rateLimited: true,
          resetAt: resetAt.toISOString(),
          remaining: 0,
          limit: ANALYSIS_LIMIT,
        },
        { status: 429 }
      );
    }

    // ── 4. Parse image from FormData ────────────────────────────────────────
    const formData = await req.formData();
    const image = formData.get("image");

    if (!image || typeof image === "string") {
      return NextResponse.json(
        { error: "مفيش صورة اتبعتت." },
        { status: 400 }
      );
    }

    // ── 5. Validate image ────────────────────────────────────────────────────
    if (image.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "الصورة كبيرة جدًا. اختار صورة أقل من 10MB." },
        { status: 400 }
      );
    }

    // ── 6. Validate the actual bytes, not only the browser-provided MIME type ──
    const bytes = await image.arrayBuffer();
    const detectedMimeType = detectImageType(new Uint8Array(bytes));

    if (!detectedMimeType || !PROVIDER_IMAGE_TYPES.has(detectedMimeType)) {
      return NextResponse.json(
        { error: "الملف ده مش صورة مدعومة. اختار JPG أو PNG أو WEBP أو HEIC/HEIF." },
        { status: 415 }
      );
    }

    let normalizedImage;
    try {
      normalizedImage = await normalizeImageForOpenRouter(bytes, detectedMimeType);
    } catch (conversionError) {
      console.error("[Luqmati] Image normalization failed:", conversionError);
      return NextResponse.json(
        { error: "فشل تحويل الصورة للتنسيق المناسب. جرّب صورة أوضح." },
        { status: 415 }
      );
    }

    // ── 7. Convert image to Base64 ───────────────────────────────────────────
    const base64 = Buffer.from(normalizedImage.buffer).toString("base64");
    const mimeType = normalizedImage.mimeType;

    // Compute image hash and check in-memory cache to avoid repeated AI calls
    const imageHash = createHash("sha256").update(Buffer.from(normalizedImage.buffer)).digest("hex");
    if (IMAGE_RESULT_CACHE.has(imageHash)) {
      try {
        const cachedResult = IMAGE_RESULT_CACHE.get(imageHash);
        // Save a new meal record for this user using the cached AI result
        const mealIdCached = crypto.randomUUID();
        await db.insert(meals).values({
          id: mealIdCached,
          userId,
          foodName: cachedResult.foodName || "Unknown",
          foodNameArabic: cachedResult.foodNameArabic || null,
          descriptionArabic: cachedResult.descriptionArabic || null,
          portionSize: cachedResult.portion?.size || null,
          estimatedGrams: Number(cachedResult.portion?.estimatedGrams) || null,
          calories: Number(cachedResult.calories) || null,
          protein: Number(cachedResult.protein) || null,
          carbs: Number(cachedResult.carbs) || null,
          fats: Number(cachedResult.fats) || null,
          confidence: cachedResult.confidence || "low",
          ingredients: cachedResult.ingredients || [],
          imageUrl: null,
        });

        const newCountCached = Number(recentCount) + 1;
        const remainingCached = Math.max(0, ANALYSIS_LIMIT - newCountCached);

        const windowMealsCached = await db
          .select({ createdAt: meals.createdAt })
          .from(meals)
          .where(
            and(
              eq(meals.userId, userId),
              gte(meals.createdAt, windowStart)
            )
          )
          .orderBy(meals.createdAt)
          .limit(1);

        const resetAtCached = windowMealsCached.length > 0
          ? new Date(windowMealsCached[0].createdAt.getTime() + ANALYSIS_WINDOW_MS)
          : new Date(Date.now() + ANALYSIS_WINDOW_MS);

        return NextResponse.json({
          success: true,
          mealId: mealIdCached,
          result: cachedResult,
          usage: {
            used: newCountCached,
            limit: ANALYSIS_LIMIT,
            remaining: remainingCached,
            resetAt: resetAtCached.toISOString(),
          },
        });
      } catch (cacheDbErr) {
        console.warn('[Luqmati] Cache hit save failed, falling back to AI path:', cacheDbErr);
        // If saving the cached result fails, continue to call the AI normally.
      }
    }

    // ── 8. Send to OpenRouter with a narrowly-scoped model fallback ───────────
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || !apiKey.startsWith("sk-or-")) {
      console.error("[Luqmati] OPENROUTER_API_KEY is missing or malformed on the server.");
      return NextResponse.json(
        { error: "خدمة تحليل الأكل غير مُعدة حاليًا. حاول تاني بعد شوية." },
        { status: 503 }
      );
    }

    const primaryModel = process.env.OPENROUTER_MODEL?.trim() || FALLBACK_MODEL;
    const fallbackModels = [primaryModel, FALLBACK_MODEL];

    // Deduplicate models to try
    const modelsToTry = [...new Set(fallbackModels)];

    let responseData = null;
    let lastErrorData = null;
    let lastStatus = 502;
    let lastError = null;

    for (const modelCandidate of modelsToTry) {
      try {
        const result = await callOpenRouter(apiKey, modelCandidate, mimeType, base64);
        lastStatus = result.response.status;
        if (result.response.ok) {
          responseData = result.data;
          break; // Success!
        } else {
          lastErrorData = result.data;
          console.warn(
            `[Luqmati] Model ${modelCandidate} failed (${result.response.status}):`,
            lastErrorData?.error?.message || result.rawText.slice(0, 300)
          );

          // Retry only stale/invalid model or modality settings. Retrying auth,
          // quota, or provider failures with another model hides the root cause.
          const providerMessage = String(lastErrorData?.error?.message || "").toLowerCase();
          const shouldTryFallback =
            (result.response.status === 400 || result.response.status === 404) &&
            /model|vision|image|modal|input/.test(providerMessage);
          if (!shouldTryFallback) break;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[Luqmati] Model ${modelCandidate} fetch error:`, err.message);
        break;
      }
    }

    if (!responseData) {
      console.error("[Luqmati] All AI model candidates failed. Last error:", lastErrorData);
      if (lastError?.name === "AbortError") {
        return NextResponse.json(
          { error: "التحليل أخد وقت أطول من اللازم. جرّب صورة أوضح وحاول تاني." },
          { status: 504 }
        );
      }
      if (lastStatus === 401 || lastStatus === 403) {
        return NextResponse.json(
          { error: "خدمة تحليل الأكل غير متاحة حاليًا. حاول تاني بعد شوية." },
          { status: 503 }
        );
      }
      if (lastStatus === 429) {
        return NextResponse.json(
          { error: "خدمة التحليل مشغولة حاليًا. حاول تاني بعد شوية." },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: "حصلت مشكلة مؤقتة في سيرفر الذكاء الاصطناعي. حاول تاني كمان شوية." },
        { status: lastError ? 502 : 503 }
      );
    }

    // ── 9. Parse OpenRouter response ─────────────────────────────────────────
    const content = getAssistantText(responseData?.choices?.[0]?.message?.content);

    if (!content) {
      console.error("[Luqmati] Empty AI response:", JSON.stringify(responseData).slice(0, 1200));
      return NextResponse.json(
        { error: "الـAI مرجعش نتيجة. حاول تاني." },
        { status: 502 }
      );
    }

    // ── 10. Extract and validate JSON ────────────────────────────────────────
    let result;
    try {
      result = normalizeResult(JSON.parse(extractJson(content)));
    } catch {
      console.error("[Luqmati] Invalid AI JSON:", content.slice(0, 500));
      return NextResponse.json(
        { error: "الـAI رجّع بيانات غير صالحة. حاول تاني." },
        { status: 502 }
      );
    }

    // Cache the normalized result for identical images to speed up repeated scans
    try {
      if (typeof imageHash === 'string' && imageHash) {
        IMAGE_RESULT_CACHE.set(imageHash, result);
      }
    } catch (cacheErr) {
      console.warn('[Luqmati] Failed to write result to cache:', cacheErr);
    }

    // ── 11. Save to DB ───────────────────────────────────────────────────────
    const mealId = crypto.randomUUID();

    await db.insert(meals).values({
      id: mealId,
      userId,
      foodName: result.foodName || "Unknown",
      foodNameArabic: result.foodNameArabic || null,
      descriptionArabic: result.descriptionArabic || null,
      portionSize: result.portion?.size || null,
      estimatedGrams: Number(result.portion?.estimatedGrams) || null,
      calories: Number(result.calories) || null,
      protein: Number(result.protein) || null,
      carbs: Number(result.carbs) || null,
      fats: Number(result.fats) || null,
      confidence: result.confidence || "low",
      ingredients: result.ingredients || [],
      imageUrl: null,
    });

    // ── 11. Return result with usage info ────────────────────────────────────
    const newCount = Number(recentCount) + 1;
    const remaining = Math.max(0, ANALYSIS_LIMIT - newCount);

    const windowMeals = await db
      .select({ createdAt: meals.createdAt })
      .from(meals)
      .where(
        and(
          eq(meals.userId, userId),
          gte(meals.createdAt, windowStart)
        )
      )
      .orderBy(meals.createdAt)
      .limit(1);

    const resetAt = windowMeals.length > 0
      ? new Date(windowMeals[0].createdAt.getTime() + ANALYSIS_WINDOW_MS)
      : new Date(Date.now() + ANALYSIS_WINDOW_MS);

    return NextResponse.json({
      success: true,
      mealId,
      result,
      usage: {
        used: newCount,
        limit: ANALYSIS_LIMIT,
        remaining,
        resetAt: resetAt.toISOString(),
      },
    });

  } catch (error) {
    console.error("[Luqmati] Analyze Food Error:", error);
    return NextResponse.json(
      { error: "حصل خطأ أثناء تحليل الأكل. حاول تاني." },
      { status: 500 }
    );
  }
}
