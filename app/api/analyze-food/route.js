import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { db, isDatabaseConfigured } from "@/config/db";
import { meals } from "@/db/schema";
import { eq, and, gte, count } from "drizzle-orm";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const OPENROUTER_TIMEOUT_MS = 45_000;
const FALLBACK_MODEL = "google/gemini-2.5-flash";
const PROVIDER_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// ── Rate limit constants ────────────────────────────────────────────────────
const ANALYSIS_LIMIT = 3;
const ANALYSIS_WINDOW_MS = 5 * 60 * 60 * 1000; // 5 hours

// ── System prompt ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `
You are Luqmati (لقمتي), an AI food analysis assistant specialized in Egyptian and Arabic food.

Your main job is to analyze food images and estimate nutritional information.

IMPORTANT LANGUAGE RULES:
- The user is Egyptian.
- Understand Egyptian Arabic food names and Egyptian colloquial expressions.
- Understand both Arabic and English names for food.
- When generating user-facing Arabic text, use simple natural Egyptian Arabic.
- Do not use formal complicated Arabic.
- Internal JSON field names must remain in English.

EGYPTIAN FOOD KNOWLEDGE:

You should recognize common Egyptian foods such as:
- طاجن
- حواوشي
- كشري
- فول
- طعمية / فلافل
- ملوخية
- محشي
- فتة
- مسقعة
- بامية
- عدس
- بسلة
- فاصوليا
- بطاطس
- أرز مصري
- مكرونة
- عيش بلدي
- فطير
- كفتة
- كباب
- فراخ مشوية
- فراخ مقلية
- لحمة
- سمك
- جمبري
- بيض
- جبنة
- شوربة
- أكلات البيت المصري
- أكل المطاعم المصرية

Also recognize mixed meals and homemade Egyptian dishes.

IMPORTANT:
Do not assume every Egyptian dish has one fixed recipe.

Recipes and quantities can vary.

NUTRITION ESTIMATION:

Estimate:
- calories
- protein
- carbohydrates
- fats
- ingredient quantities

The values are estimates based on the visible food and estimated portion size.

Never pretend that image-based nutrition estimates are exact.

If the portion or ingredient is unclear, lower the confidence.

If something cannot be identified reliably, say so.

DO NOT invent ingredients that are clearly not visible unless they are strongly associated with the identified dish.

PORTION ESTIMATION:

Estimate the portion using visual clues such as:
- plate size
- bowl size
- visible quantity
- food density

Use practical portions such as:
- small
- medium
- large
- approximate grams

PROTEIN ANALYSIS:

Identify the main protein sources.

For example:
Rice + lentils
Chicken + rice
Beans
Eggs
Meat
Fish

If a meal contains complementary plant protein sources such as grains and legumes, mention that they can complement each other's amino-acid profiles.

Do not make medical claims.

OUTPUT:

Return ONLY valid JSON.

Do not return Markdown.
Do not wrap JSON in code fences.
Do not add explanations outside JSON.

Use exactly this structure:

{
  "foodName": "",
  "foodNameArabic": "",
  "descriptionArabic": "",
  "portion": {
    "size": "",
    "estimatedGrams": 0
  },
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fats": 0,
  "proteinNote": "",
  "ingredients": [
    {
      "name": "",
      "nameArabic": "",
      "estimatedGrams": 0,
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fats": 0
    }
  ],
  "confidence": "high"
}

confidence MUST be exactly one of:

"high"
"medium"
"low"

proteinNote: optional short note about protein quality or amino acid completeness. Leave empty string if not applicable.

Keep the response concise.

The goal is fast, structured and useful results for Luqmati.
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
          max_tokens: 900,
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

    if (!detectedMimeType) {
      return NextResponse.json(
        { error: "الملف ده مش صورة مدعومة. اختار JPG أو PNG أو WEBP." },
        { status: 415 }
      );
    }

    if (detectedMimeType === "image/heic") {
      return NextResponse.json(
        { error: "صيغة HEIC/HEIF محتاجة تحويل. افتح الصورة من جهازك أو حوّلها لـJPG وحاول تاني." },
        { status: 415 }
      );
    }

    if (!PROVIDER_IMAGE_TYPES.has(detectedMimeType)) {
      return NextResponse.json(
        { error: "صيغة الصورة دي مش مدعومة للتحليل. اختار JPG أو PNG أو WEBP." },
        { status: 415 }
      );
    }

    // ── 7. Convert image to Base64 ───────────────────────────────────────────
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = detectedMimeType;

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
