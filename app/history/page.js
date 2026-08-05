"use client";

import { useEffect, useState } from "react";
import { useAuth, SignInButton } from "@clerk/nextjs";

// Group meals by relative date label
function groupByDate(meals) {
  const groups = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const meal of meals) {
    const d = new Date(meal.createdAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    let label;
    if (day.getTime() === today.getTime())     label = "اليوم";
    else if (day.getTime() === yesterday.getTime()) label = "أمس";
    else label = d.toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" });

    if (!groups[label]) groups[label] = [];
    groups[label].push(meal);
  }
  return groups;
}

// Confidence dot color
function confColor(c) {
  if (c === "high")   return "#22c55e";
  if (c === "medium") return "#f59e0b";
  return "#ef4444";
}

export default function HistoryPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const [meals,   setMeals]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { setLoading(false); return; }

    async function fetchMeals() {
      try {
        const res  = await fetch("/api/meals");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "حصل خطأ.");
        setMeals(data.meals || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchMeals();
  }, [isLoaded, isSignedIn]);

  // ── Not signed in ────────────────────────────────────────────────────────
  if (isLoaded && !isSignedIn) {
    return (
      <div style={{ minHeight: "80dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
        <div className="glass-card" style={{ padding: "40px 32px", maxWidth: "360px", width: "100%" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔒</div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "10px" }}>
            لازم تسجل دخول
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px" }}>
            عشان تشوف سجل وجباتك، سجل دخول أو عمل حساب جديد
          </p>
          <SignInButton mode="modal">
            <button className="btn-primary" style={{ width: "100%", height: "48px", fontSize: "15px" }}>
              سجل دخول
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ minHeight: "80dvh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px" }}>
          <div className="spinner" />
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>جاري تحميل سجلك...</p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div style={{ minHeight: "80dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ textAlign: "center", color: "#dc2626", fontSize: "14px" }}>
          <p>⚠️ {error}</p>
          <button className="btn-outline" style={{ marginTop: "16px", padding: "10px 20px" }} onClick={() => window.location.reload()}>
            حاول تاني
          </button>
        </div>
      </div>
    );
  }

  const groups = groupByDate(meals);
  const groupKeys = Object.keys(groups);

  // ── Empty state ───────────────────────────────────────────────────────────
  if (groupKeys.length === 0) {
    return (
      <div style={{ minHeight: "80dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
        <div style={{ fontSize: "60px", marginBottom: "16px" }}>🍽️</div>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
          السجل فاضي لسه
        </h2>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px" }}>
          صوّر أي طبق وحلّله عشان يتسجل هنا
        </p>
        <a href="/" className="btn-primary" style={{ padding: "12px 28px", fontSize: "15px", textDecoration: "none" }}>
          حلّل طبق دلوقتي
        </a>
      </div>
    );
  }

  // ── Meals list ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "80dvh", padding: "24px 16px" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "28px" }}>
          <h1
            className="font-arabic"
            style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}
          >
            السجل
          </h1>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
            {meals.length} وجبة مسجلة
          </p>
        </div>

        {/* Groups */}
        {groupKeys.map((label, gi) => (
          <div key={label} className={`fade-in fade-in-delay-${Math.min(gi + 1, 4)}`} style={{ marginBottom: "28px" }}>
            <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {label}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {groups[label].map((meal) => {
                const time = new Date(meal.createdAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={meal.id} className="meal-row">
                    {/* Thumbnail placeholder */}
                    <div
                      className="meal-thumbnail"
                      style={{
                        background: "linear-gradient(135deg, rgba(124,58,237,0.15), rgba(167,139,250,0.1))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "24px",
                        flexShrink: 0,
                      }}
                    >
                      🍽️
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: "15px", color: "var(--text-primary)", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {meal.foodNameArabic || meal.foodName}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
                        <span
                          style={{ width: "8px", height: "8px", borderRadius: "50%", background: confColor(meal.confidence), flexShrink: 0 }}
                        />
                        <span className="font-english">{meal.calories ?? "—"} kcal</span>
                        <span>·</span>
                        <span>{time}</span>
                      </div>

                      {/* Mini macro row */}
                      {(meal.protein || meal.carbs || meal.fats) && (
                        <div style={{ display: "flex", gap: "10px", marginTop: "5px", fontSize: "11px" }}>
                          {meal.protein && <span style={{ color: "var(--color-protein)" }}>💪 {meal.protein}g</span>}
                          {meal.carbs   && <span style={{ color: "var(--color-carbs)"   }}>🍚 {meal.carbs}g</span>}
                          {meal.fats    && <span style={{ color: "var(--color-fats)"    }}>🥑 {meal.fats}g</span>}
                        </div>
                      )}
                    </div>

                    {/* Chevron */}
                    <svg width="16" height="16" fill="none" stroke="var(--text-muted)" strokeWidth="2" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                    </svg>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
