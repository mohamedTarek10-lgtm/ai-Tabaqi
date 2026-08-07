import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

import { db, isDatabaseConfigured } from "@/config/db";
import { meals } from "@/db/schema";

const SYSTEM_PROMPT = `
You are Tabaqi (طبقي), an AI food analysis assistant specialized in Egyptian and Arabic food.

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

Keep the response concise.

The goal is fast, structured and useful results for Tabaqi.
`;

export async function POST(req) {
  try {
    if (!isDatabaseConfigured) {
      return NextResponse.json(
        { error: "قاعدة البيانات غير مُعدة بعد. أضف رابط Neon الصحيح في DATABASE_URL." },
        { status: 503 }
      );
    }

    // ==============================
    // 1. Check Clerk authentication
    // ==============================

    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        {
          error: "لازم تعمل تسجيل دخول الأول.",
        },
        { status: 401 }
      );
    }

    // ==============================
    // 2. Get image from FormData
    // ==============================

    const formData = await req.formData();

    const image = formData.get("image");

    if (!image || typeof image === "string") {
      return NextResponse.json(
        {
          error: "مفيش صورة اتبعتت.",
        },
        { status: 400 }
      );
    }

    // ==============================
    // 3. Validate image
    // ==============================

    if (!image.type.startsWith("image/")) {
      return NextResponse.json(
        {
          error: "الملف لازم يكون صورة.",
        },
        { status: 400 }
      );
    }

    // Maximum 10MB
    if (image.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        {
          error: "الصورة كبيرة جدًا. اختار صورة أقل من 10MB.",
        },
        { status: 400 }
      );
    }

    // ==============================
    // 4. Convert image to Base64
    // ==============================

    const bytes = await image.arrayBuffer();

    const base64 = Buffer.from(bytes).toString("base64");

    const mimeType = image.type || "image/jpeg";

    // ==============================
    // 5. Send image to OpenRouter
    // ==============================

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",

        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          model:
            process.env.OPENROUTER_MODEL ||
            "google/gemma-4-26b-a4b-it:free",

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
                  text: "حلل الطبق ده حسب تعليمات Tabaqi.",
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

    // ==============================
    // 6. Read OpenRouter response
    // ==============================

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter Error:", data);

      return NextResponse.json(
        {
          error:
            data?.error?.message ||
            "حصلت مشكلة أثناء تحليل الصورة.",
        },
        {
          status: response.status,
        }
      );
    }

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        {
          error: "الـAI مرجعش نتيجة.",
        },
        {
          status: 500,
        }
      );
    }

    // ==============================
    // 7. Clean AI response
    // ==============================

    const cleanedContent = content
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    let result;

    try {
      result = JSON.parse(cleanedContent);
    } catch (error) {
      console.error("Invalid AI JSON:", content);

      return NextResponse.json(
        {
          error: "الـAI رجّع بيانات غير صالحة.",
          raw: content,
        },
        {
          status: 500,
        }
      );
    }

    // ==============================
    // 8. Save result in Drizzle
    // ==============================

    const mealId = crypto.randomUUID();

    await db.insert(meals).values({
      id: mealId,

      userId: userId,

      foodName: result.foodName || "Unknown",

      foodNameArabic:
        result.foodNameArabic || null,

      descriptionArabic:
        result.descriptionArabic || null,

      portionSize:
        result.portion?.size || null,

      estimatedGrams:
        Number(result.portion?.estimatedGrams) || null,

      calories:
        Number(result.calories) || null,

      protein:
        Number(result.protein) || null,

      carbs:
        Number(result.carbs) || null,

      fats:
        Number(result.fats) || null,

      confidence:
        result.confidence || "low",

      ingredients:
        result.ingredients || [],

      imageUrl: null,
    });

    // ==============================
    // 9. Return result
    // ==============================

    return NextResponse.json({
      success: true,

      mealId,

      result,
    });
  } catch (error) {
    console.error("Analyze Food Error:", error);

    return NextResponse.json(
      {
        error: "حصل خطأ أثناء تحليل الأكل.",
      },
      {
        status: 500,
      }
    );
  }
}
