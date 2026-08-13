"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useAuth, SignInButton } from "@clerk/nextjs";
import Link from "next/link";
import { useLang } from "../i18n-context";

// Group meals by relative date label
function groupByDate(meals, t, lang) {
  const groups = {};
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const meal of meals) {
    const d = new Date(meal.createdAt);
    const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    let label;
    if (day.getTime() === today.getTime()) label = t.today;
    else if (day.getTime() === yesterday.getTime()) label = t.yesterday;
    else label = d.toLocaleDateString(lang === "ar" ? "ar-EG" : "en-US", { weekday: "long", day: "numeric", month: "short" });

    if (!groups[label]) groups[label] = [];
    groups[label].push(meal);
  }
  return groups;
}

function confColor(c) {
  if (c === "high")   return "#22c55e";
  if (c === "medium") return "#f59e0b";
  return "#ef4444";
}

function subscribeToOnlineStatus(callback) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineStatus() {
  return typeof navigator === "undefined" ? true : navigator.onLine;
}

export default function HistoryPage() {
  const { isSignedIn, isLoaded, userId } = useAuth();
  const { t, lang } = useLang();
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isOffline = !useSyncExternalStore(subscribeToOnlineStatus, getOnlineStatus, () => true);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      return;
    }

    // Keep offline history isolated per authenticated Clerk user. A shared
    // cache key could show one user's meals to another user on the same device.
    const cacheKey = userId ? `luqmati-meals-cache:${userId}` : null;
    const cached = cacheKey ? localStorage.getItem(cacheKey) : null;
    if (cached) {
      try {
        // Hydrate the per-user snapshot before attempting the network refresh.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setMeals(JSON.parse(cached));
        setLoading(false);
      } catch (e) {}
    }

    async function fetchMeals() {
      try {
        const res = await fetch("/api/meals");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || t.analysisError);
        const fetched = data.meals || [];
        setMeals(fetched);
        // Cache for offline history access
        if (cacheKey) localStorage.setItem(cacheKey, JSON.stringify(fetched));
      } catch (err) {
        if (!cached) setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    if (navigator.onLine) {
      fetchMeals();
    } else {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, userId, t.analysisError]);

  // ── Not Signed In ─────────────────────────────────────────────────────────
    if (isLoaded && !isSignedIn) {
    return (
      <div style={{ minHeight: "80dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
        <div className="glass-card fade-in" style={{ padding: "40px 28px", maxWidth: "380px", width: "100%" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔒</div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "10px" }}>
            {t.loginRequired}
          </h2>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px" }}>
            {t.loginToSeeHistory}
          </p>
          <SignInButton mode="modal">
            <button className="btn-primary" style={{ width: "100%", height: "48px", fontSize: "15px" }}>
              {t.btnLoginNow}
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
          <p style={{ color: "var(--text-secondary)", fontSize: "14px" }}>{t.historyLoading}</p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────
  if (error && meals.length === 0) {
    return (
      <div style={{ minHeight: "80dvh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
        <div style={{ textAlign: "center", color: "var(--status-error)", fontSize: "14px" }}>
          <p>⚠️ {error}</p>
          <button className="btn-outline" style={{ marginTop: "16px", padding: "10px 20px" }} onClick={() => window.location.reload()}>
            {t.retry}
          </button>
        </div>
      </div>
    );
  }

  const groups = groupByDate(meals, t, lang);
  const groupKeys = Object.keys(groups);

  // ── Empty State ───────────────────────────────────────────────────────────
  if (groupKeys.length === 0) {
    return (
      <div style={{ minHeight: "80dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", textAlign: "center" }}>
        <div style={{ fontSize: "60px", marginBottom: "16px" }}>🍽️</div>
        <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "8px" }}>
          {t.historyEmpty}
        </h2>
        <p style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "24px" }}>
          {t.historyEmptyHint}
        </p>
        <Link href="/" className="btn-primary" style={{ padding: "12px 28px", fontSize: "15px", textDecoration: "none" }}>
          {t.btnAnalyzeNow}
        </Link>
      </div>
    );
  }

  // ── Meals List ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "80dvh", padding: "24px 16px 40px" }}>
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>

        {/* Offline indicator */}
        {isOffline && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: "10px",
              background: "var(--status-warning-bg)",
              border: "1px solid var(--status-warning-border)",
              color: "var(--status-warning)",
              fontSize: "12px",
              marginBottom: "16px",
              textAlign: "center",
            }}
          >
            📶 {t.offlineHistoryMsg}
          </div>
        )}

        {/* Header */}
        <div style={{ marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <h1 className="font-arabic" style={{ fontSize: "28px", fontWeight: 700, color: "var(--text-primary)", marginBottom: "4px" }}>
              {t.historyTitle}
            </h1>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              {meals.length} {t.mealsCount}
            </p>
          </div>
        </div>

        {/* Date Groups */}
        {groupKeys.map((label, gi) => (
          <div key={label} className={`fade-in fade-in-delay-${Math.min(gi + 1, 4)}`} style={{ marginBottom: "28px" }}>
            <p style={{ fontSize: "12px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {label}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {groups[label].map((meal) => {
                const time = new Date(meal.createdAt).toLocaleTimeString(lang === "ar" ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" });
                return (
                  <div key={meal.id} className="meal-row">
                    <div
                      className="meal-thumbnail"
                      style={{
                        background: "linear-gradient(135deg, rgba(108,63,212,0.18), rgba(236,72,153,0.12))",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "24px",
                      }}
                    >
                      🍽️
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: "15px", color: "var(--text-primary)", marginBottom: "4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {lang === "ar" ? (meal.foodNameArabic || meal.foodName) : (meal.foodName || meal.foodNameArabic)}
                      </p>

                      <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: confColor(meal.confidence), flexShrink: 0 }} />
                        <span className="english-font">{meal.calories ?? "—"} {t.kcal}</span>
                        <span>·</span>
                        <span>{time}</span>
                      </div>

                      {(meal.protein || meal.carbs || meal.fats) && (
                        <div style={{ display: "flex", gap: "10px", marginTop: "6px", fontSize: "11px", fontWeight: 600 }}>
                          {meal.protein && <span style={{ color: "var(--color-protein)" }}>💪 {meal.protein}g</span>}
                          {meal.carbs   && <span style={{ color: "var(--color-carbs)"   }}>🍚 {meal.carbs}g</span>}
                          {meal.fats    && <span style={{ color: "var(--color-fats)"    }}>🥑 {meal.fats}g</span>}
                        </div>
                      )}
                    </div>
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
