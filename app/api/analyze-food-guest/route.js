import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_IMAGE_BYTES = 20 * 1024 * 1024; // 20MB — generous, client already compressed
const OPENROUTER_TIMEOUT_MS = 50_000;
const FALLBACK_MODEL = "google/gemini-2.5-flash";

const PROVIDER_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function detectImageType(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
      String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  if (["GIF87a", "GIF89a"].includes(String.fromCharCode(...bytes.slice(0, 6)))) return "image/gif";
  // Accept any other format as JPEG (client already converted via canvas)
  return "image/jpeg";
}

function getAssistantText(content) {
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content.filter((p) => typeof p?.text === "string").map((p) => p.text).join("\n").trim();
  }
  return "";
}

function extractJson(text) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  let start = -1, depth = 0, inString = false, escaped = false;
  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char === "{") { if (start === -1) start = i; depth++; }
    else if (char === "}" && start !== -1) { depth--; if (depth === 0) return cleaned.slice(start, i + 1); }
  }
  return cleaned;
}

function finiteNumber(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeResult(result) {
  if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("invalid");
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
      ? result.ingredients.slice(0, 40).map((ing) => ({
          name: String(ing?.name || "Unknown").slice(0, 120),
          nameArabic: ing?.nameArabic ? String(ing.nameArabic).slice(0, 120) : "",
          estimatedGrams: Math.max(0, Math.round(finiteNumber(ing?.estimatedGrams))),
          calories: Math.max(0, Math.round(finiteNumber(ing?.calories))),
          protein: Math.max(0, finiteNumber(ing?.protein)),
          carbs: Math.max(0, finiteNumber(ing?.carbs)),
          fats: Math.max(0, finiteNumber(ing?.fats)),
        }))
      : [],
    confidence: ["high", "medium", "low"].includes(result.confidence) ? result.confidence : "low",
  };
}

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
Return ONLY valid JSON with exactly this structure (no markdown, no code fences):
{"foodName":"","foodNameArabic":"","descriptionArabic":"","portion":{"size":"","estimatedGrams":0},"calories":0,"protein":0,"carbs":0,"fats":0,"proteinNote":"","ingredients":[{"name":"","nameArabic":"","estimatedGrams":0,"calories":0,"protein":0,"carbs":0,"fats":0}],"confidence":"high"}
confidence MUST be exactly one of: "high", "medium", "low"
`;

export async function POST(req) {
  try {
    const formData = await req.formData();
    const image = formData.get("image");

    if (!image || typeof image === "string") {
      return NextResponse.json({ error: "مفيش صورة اتبعتت." }, { status: 400 });
    }

    if (image.size > MAX_IMAGE_BYTES) {
      return NextResponse.json({ error: "الصورة كبيرة جدًا. اختار صورة أقل من 20MB." }, { status: 400 });
    }

    const bytes = await image.arrayBuffer();
    const uint8 = new Uint8Array(bytes);
    const detectedMime = detectImageType(uint8);
    const mimeType = PROVIDER_IMAGE_TYPES.has(detectedMime) ? detectedMime : "image/jpeg";
    const base64 = Buffer.from(bytes).toString("base64");

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || !apiKey.startsWith("sk-or-")) {
      return NextResponse.json({ error: "خدمة التحليل غير متاحة حاليًا." }, { status: 503 });
    }

    const model = process.env.OPENROUTER_MODEL?.trim() || FALLBACK_MODEL;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPENROUTER_TIMEOUT_MS);

    let aiResponse, aiData;
    try {
      aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
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
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: "حلل الطبق ده حسب تعليمات Luqmati." },
                { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
              ],
            },
          ],
          temperature: 0.1,
          max_tokens: 900,
        }),
      });
      aiData = await aiResponse.json().catch(() => null);
    } finally {
      clearTimeout(timeout);
    }

    if (!aiResponse?.ok || !aiData) {
      const msg = aiData?.error?.message || "";
      if (aiResponse?.status === 429) {
        return NextResponse.json({ error: "خدمة التحليل مشغولة حاليًا. حاول تاني بعد شوية." }, { status: 503 });
      }
      // Retry with fallback model if modality error
      if ((aiResponse?.status === 400 || aiResponse?.status === 404) && /model|vision|image|modal/.test(msg)) {
        const ctrl2 = new AbortController();
        const t2 = setTimeout(() => ctrl2.abort(), OPENROUTER_TIMEOUT_MS);
        try {
          const r2 = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            signal: ctrl2.signal,
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://luqmati.app",
              "X-Title": "Luqmati",
            },
            body: JSON.stringify({
              model: FALLBACK_MODEL,
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                {
                  role: "user",
                  content: [
                    { type: "text", text: "حلل الطبق ده حسب تعليمات Luqmati." },
                    { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64}` } },
                  ],
                },
              ],
              temperature: 0.1,
              max_tokens: 900,
            }),
          });
          aiData = await r2.json().catch(() => null);
          if (r2.ok && aiData) aiResponse = r2;
        } finally {
          clearTimeout(t2);
        }
      }
      if (!aiResponse?.ok || !aiData) {
        return NextResponse.json({ error: "حصلت مشكلة في التحليل. حاول تاني." }, { status: 502 });
      }
    }

    const content = getAssistantText(aiData?.choices?.[0]?.message?.content);
    if (!content) {
      return NextResponse.json({ error: "الـAI مرجعش نتيجة. حاول تاني." }, { status: 502 });
    }

    let result;
    try {
      result = normalizeResult(JSON.parse(extractJson(content)));
    } catch {
      return NextResponse.json({ error: "الـAI رجّع بيانات غير صالحة. حاول تاني." }, { status: 502 });
    }

    return NextResponse.json({ success: true, result, guestTrial: true });
  } catch (error) {
    if (error?.name === "AbortError") {
      return NextResponse.json({ error: "التحليل أخد وقت أطول من اللازم. جرّب تاني بصورة أوضح." }, { status: 504 });
    }
    console.error("[Luqmati Guest] Error:", error);
    return NextResponse.json({ error: "حصل خطأ أثناء التحليل. حاول تاني." }, { status: 500 });
  }
}
