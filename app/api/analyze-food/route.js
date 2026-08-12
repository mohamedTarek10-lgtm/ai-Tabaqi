import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { db, isDatabaseConfigured } from "@/config/db";
import { meals } from "@/db/schema";
import { eq, and, gte, count } from "drizzle-orm";

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
async function callOpenRouter(apiKey, model, mimeType, base64) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

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
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function POST(req) {
  try {
    // ── 1. Database check ────────────────────────────────────────────────────
    if (!isDatabaseConfigured) {
      return NextResponse.json(
        { error: "قاعدة البيانات غير مُعدة بعد." },
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

    const [{ value: recentCount }] = await db
      .select({ value: count() })
      .from(meals)
      .where(
        and(
          eq(meals.userId, userId),
          gte(meals.createdAt, windowStart)
        )
      );

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
    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "الملف لازم يكون صورة." },
        { status: 400 }
      );
    }

    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "الصورة كبيرة جدًا. اختار صورة أقل من 10MB." },
        { status: 400 }
      );
    }

    // ── 6. Convert image to Base64 ───────────────────────────────────────────
    const bytes = await image.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const mimeType = image.type || "image/jpeg";

    // ── 7. Send to OpenRouter with automatic model fallback ──────────────────
    const apiKey = process.env.OPENROUTER_API_KEY;
    const primaryModel = process.env.OPENROUTER_MODEL || "google/gemini-2.5-flash";
    const fallbackModels = [primaryModel, "google/gemini-2.5-pro", "google/gemini-2.5-flash"];

    // Deduplicate models to try
    const modelsToTry = [...new Set(fallbackModels)];

    let response = null;
    let lastErrorData = null;

    for (const modelCandidate of modelsToTry) {
      try {
        const res = await callOpenRouter(apiKey, modelCandidate, mimeType, base64);
        if (res.ok) {
          response = res;
          break; // Success!
        } else {
          lastErrorData = await res.json();
          console.warn(`[Luqmati] Model ${modelCandidate} failed (${res.status}):`, lastErrorData?.error?.message);
        }
      } catch (err) {
        console.warn(`[Luqmati] Model ${modelCandidate} fetch error:`, err.message);
      }
    }

    if (!response) {
      console.error("[Luqmati] All AI model candidates failed. Last error:", lastErrorData);
      return NextResponse.json(
        { error: "حصلت مشكلة مؤقتة في سيرفر الذكاء الاصطناعي. حاول تاني كمان شوية." },
        { status: 502 }
      );
    }

    // ── 8. Parse OpenRouter response ─────────────────────────────────────────
    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      console.error("[Luqmati] Empty AI response:", JSON.stringify(data));
      return NextResponse.json(
        { error: "الـAI مرجعش نتيجة. حاول تاني." },
        { status: 500 }
      );
    }

    // ── 9. Extract and clean JSON ────────────────────────────────────────────
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const cleanedContent = jsonMatch
      ? jsonMatch[0]
      : content
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();

    let result;
    try {
      result = JSON.parse(cleanedContent);
    } catch {
      console.error("[Luqmati] Invalid AI JSON:", content.slice(0, 500));
      return NextResponse.json(
        { error: "الـAI رجّع بيانات غير صالحة. حاول تاني." },
        { status: 500 }
      );
    }

    // ── 10. Save to DB ───────────────────────────────────────────────────────
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
    const newCount = recentCount + 1;
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