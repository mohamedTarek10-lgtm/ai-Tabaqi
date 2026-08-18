import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db, isDatabaseConfigured } from "@/config/db";
import { meals } from "@/db/schema";
import { eq, and, gte, count } from "drizzle-orm";

const ANALYSIS_LIMIT = 3;
const ANALYSIS_WINDOW_MS = 5 * 60 * 60 * 1000; // 5 hours

export async function GET() {
  try {
    if (!isDatabaseConfigured) {
      return NextResponse.json({ remaining: ANALYSIS_LIMIT, used: 0, limit: ANALYSIS_LIMIT, resetAt: null });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const windowStart = new Date(Date.now() - ANALYSIS_WINDOW_MS);

    const [[{ value: recentCount }], oldest] = await Promise.all([
      db
        .select({ value: count() })
        .from(meals)
        .where(and(eq(meals.userId, userId), gte(meals.createdAt, windowStart))),
      db
        .select({ createdAt: meals.createdAt })
        .from(meals)
        .where(and(eq(meals.userId, userId), gte(meals.createdAt, windowStart)))
        .orderBy(meals.createdAt)
        .limit(1),
    ]);

    const resetAt = oldest.length > 0
      ? new Date(oldest[0].createdAt.getTime() + ANALYSIS_WINDOW_MS).toISOString()
      : null;

    return NextResponse.json({
      used: recentCount,
      remaining: Math.max(0, ANALYSIS_LIMIT - recentCount),
      limit: ANALYSIS_LIMIT,
      resetAt,
    });
  } catch (err) {
    console.error("[Luqmati] Usage check error:", err);
    return NextResponse.json({ remaining: ANALYSIS_LIMIT, used: 0, limit: ANALYSIS_LIMIT, resetAt: null });
  }
}
