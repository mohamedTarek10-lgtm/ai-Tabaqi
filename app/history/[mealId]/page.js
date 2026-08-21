import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth } from "@clerk/nextjs/server";
import { db, isDatabaseConfigured } from "@/config/db";
import { meals } from "@/db/schema";

function MacroStat({ label, value, unit, emoji }) {
  return (
    <div className="glass-card" style={{ padding: "16px 12px", textAlign: "center" }}>
      <div style={{ fontSize: "20px", marginBottom: "4px" }}>{emoji}</div>
      <div style={{ fontSize: "11px", color: "var(--text-secondary)", marginBottom: "2px" }}>{label}</div>
      <div className="english-font" style={{ fontSize: "22px", fontWeight: 700, lineHeight: 1.1 }}>
        {value ?? "—"}
        <span style={{ fontSize: "12px", fontWeight: 400, marginInlineStart: "2px" }}>{unit}</span>
      </div>
    </div>
  );
}

export default async function MealDetailPage({ params }) {
  const currentAuth = await auth();
  if (!currentAuth.userId) {
    redirect("/history");
  }

  if (!isDatabaseConfigured || !db) {
    notFound();
  }

  const { mealId } = params;
  const result = await db
    .select()
    .from(meals)
    .where(and(eq(meals.id, mealId), eq(meals.userId, currentAuth.userId)))
    .limit(1);

  const meal = result[0];
  if (!meal) {
    notFound();
  }

  const ingredientList = Array.isArray(meal.ingredients) ? meal.ingredients : [];

  return (
    <main style={{ minHeight: "80dvh", padding: "24px 16px 40px" }}>
      <div style={{ maxWidth: "760px", margin: "0 auto" }}>
        <div style={{ marginBottom: "20px" }}>
          <Link href="/history" style={{ color: "var(--brand)", textDecoration: "none", fontWeight: 700 }}>← العودة للسجل</Link>
        </div>

        <h1 style={{ fontSize: "30px", margin: "0 0 18px", color: "var(--text-primary)" }}>{meal.foodName || "Meal Detail"}</h1>

        {meal.imageUrl ? (
          <div className="glass-card" style={{ padding: "16px", marginBottom: "20px" }}>
            <Image src={meal.imageUrl} alt={meal.foodName || "Meal photo"} width={760} height={360} unoptimized style={{ width: "100%", maxHeight: "360px", objectFit: "cover", borderRadius: "12px" }} />
          </div>
        ) : null}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "20px" }}>
          <MacroStat emoji="🔥" label="Calories" value={meal.calories ?? "—"} unit="kcal" />
          <MacroStat emoji="💪" label="Protein" value={meal.protein ?? "—"} unit="g" />
          <MacroStat emoji="🍞" label="Carbs" value={meal.carbs ?? "—"} unit="g" />
          <MacroStat emoji="🥑" label="Fat" value={meal.fats ?? "—"} unit="g" />
        </div>

        <div className="glass-card" style={{ padding: "18px 20px", marginBottom: "18px" }}>
          <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "10px" }}>Meal Overview</div>
          <div style={{ color: "var(--text-primary)" }}>
            <div><strong>Food:</strong> {meal.foodName || "Unknown"}</div>
            <div><strong>Arabic:</strong> {meal.foodNameArabic || "—"}</div>
            <div><strong>Portion:</strong> {meal.portionSize || "—"}</div>
            <div><strong>Estimated grams:</strong> {meal.estimatedGrams ?? "—"}</div>
            <div><strong>Confidence:</strong> {meal.confidence || "—"}</div>
          </div>
        </div>

        {ingredientList.length > 0 ? (
          <div className="glass-card" style={{ padding: "18px 20px" }}>
            <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "10px" }}>Ingredients</div>
            <ul style={{ margin: 0, paddingInlineStart: "20px", color: "var(--text-primary)", display: "grid", gap: "8px" }}>
              {ingredientList.map((ingredient, index) => (
                <li key={`${ingredient?.name || "ingredient"}-${index}`}>
                  {ingredient?.name || "Unknown"}
                  {ingredient?.estimatedGrams ? ` · ${ingredient.estimatedGrams}g` : ""}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </main>
  );
}
