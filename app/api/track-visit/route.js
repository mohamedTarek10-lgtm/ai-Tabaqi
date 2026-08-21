import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { db, isDatabaseConfigured } from "@/config/db";
import { visits } from "@/db/schema";

export const runtime = "nodejs";

function getClientIp(request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "unknown";
}

function normalizePath(pathname) {
  if (!pathname || pathname === "") return "/";
  return pathname.startsWith("/") ? pathname : `/${pathname}`;
}

export async function POST(request) {
  try {
    if (!isDatabaseConfigured || !db) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const body = await request.json().catch(() => ({}));
    const path = normalizePath(body.path || request.headers.get("x-pathname") || "/");
    const userAgent = request.headers.get("user-agent") || "unknown";
    const ip = getClientIp(request);
    const visitorHash = createHash("sha256").update(`${ip}:${userAgent}`).digest("hex");

    await db.insert(visits).values({
      id: crypto.randomUUID(),
      visitorHash,
      path,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.warn("[Luqmati] track-visit failed, continuing without storing the analytics event:", error);
    return NextResponse.json({ ok: true, skipped: true }, { status: 200 });
  }
}
