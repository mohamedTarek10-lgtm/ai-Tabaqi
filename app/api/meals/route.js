import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/config/db";
import { meals } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

// GET /api/meals — returns authenticated user's meals
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: "لازم تسجل دخول الأول." },
        { status: 401 }
      );
    }

    const userMeals = await db
      .select()
      .from(meals)
      .where(eq(meals.userId, userId))
      .orderBy(desc(meals.createdAt));

    return NextResponse.json({ meals: userMeals });
  } catch (error) {
    console.error("GET /api/meals error:", error);
    return NextResponse.json(
      { error: "حصل خطأ أثناء جلب الوجبات." },
      { status: 500 }
    );
  }
}
