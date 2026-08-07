"use client";

import { useState, useRef, useCallback } from "react";
import { useAuth } from "@clerk/nextjs";

// ─── Confidence display helpers ───────────────────────────────────────────────
function confidenceLabel(c) {
  if (c === "high")
    return { label: "دقة عالية", cls: "confidence-high", pct: "95%" };
  if (c === "medium")
    return { label: "دقة متوسطة", cls: "confidence-medium", pct: "75%" };
  return { label: "دقة منخفضة", cls: "confidence-low", pct: "50%" };
}

// ─── Macro Card ───────────────────────────────────────────────────────────────
function MacroCard({ emoji, label, value, unit, colorClass, delay }) {
  return (
    <div className={`macro-card ${colorClass} fade-in fade-in-delay-${delay}`}>
      <div style={{ fontSize: "22px", marginBottom: "6px" }}>{emoji}</div>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 500,
          opacity: 0.7,
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "26px", fontWeight: 700, lineHeight: 1 }}>
        {value ?? "—"}
        <span style={{ fontSize: "13px", fontWeight: 400, marginRight: "2px" }}>
          {unit}
        </span>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [saved, setSaved] = useState(false);

  const fileInput = useRef(null);
  const cameraInput = useRef(null);

  // ── File handling ──────────────────────────────────────────────────────────
  function handleFile(f) {
    if (!f || !f.type.startsWith("image/")) {
      setError("الملف ده مش صورة. اختار صورة تاني.");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("الصورة أكبر من 10MB. اختار صورة أصغر.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setResult(null);
    setError("");
    setSaved(false);
  }

  const onFileInput = (e) => handleFile(e.target.files?.[0]);
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  }, []);
  const onDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };
  const onDragLeave = () => setDragOver(false);

  // ── Analyze ────────────────────────────────────────────────────────────────
  async function analyzeFood() {
    if (!file) {
      setError("اختار صورة أكل الأول.");
      return;
    }
    if (!isSignedIn) {
      setError("لازم تسجل دخول الأول عشان تحلل الطبق.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult(null);
      setSaved(false);

      const form = new FormData();
      form.append("image", file);

      const res = await fetch("/api/analyze-food", {
        method: "POST",
        body: form,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "حصلت مشكلة أثناء التحليل.");

      setResult(data.result);
      setSaved(true); // API already saves it
    } catch (err) {
      setError(err.message || "حصلت مشكلة أثناء التحليل، جرّب تاني.");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");
    setSaved(false);
    if (fileInput.current) fileInput.current.value = "";
    if (cameraInput.current) cameraInput.current.value = "";
  }

  const conf = result ? confidenceLabel(result.confidence) : null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px 16px",
      }}
    >
      {/* ── Upload Card ─────────────────────────────────────────────────── */}
      {!result && (
        <div
          className="glass-card fade-in"
          style={{
            width: "100%",
            maxWidth: "520px",
            padding: "40px 32px 36px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          {/* Title */}
          <h1
            className="font-arabic"
            style={{
              fontSize: "clamp(28px, 7vw, 42px)",
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: "10px",
              lineHeight: 1.25,
            }}
          >
       اعرف اكلك
          </h1>

          <p
            style={{
              fontSize: "15px",
              color: "var(--text-secondary)",
              marginBottom: "32px",
            }}
          >
  صوّر طبقك واعرف تفاصيله
          </p>

          {/* Drop Zone / Preview */}
          {!preview ? (
            <div
              className={`upload-zone ${dragOver ? "drag-active" : ""}`}
              style={{
                width: "100%",
                minHeight: "200px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "40px 24px",
                marginBottom: "28px",
                gap: "12px",
              }}
              onClick={() => fileInput.current?.click()}
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
            >
              {/* Camera icon */}
              <div
                style={{
                  width: "68px",
                  height: "68px",
                  borderRadius: "50%",
                  background: "var(--brand)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 6px 20px rgba(124,58,237,0.4)",
                  transition: "transform 0.2s ease",
                }}
              >
                <svg
                  width="30"
                  height="30"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
                  />
                </svg>
              </div>
              <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                اسحب الصورة هنا أو اضغط للرفع
              </p>
            </div>
          ) : (
            <div
              style={{
                width: "100%",
                marginBottom: "20px",
                position: "relative",
              }}
            >
              <img
                src={preview}
                alt="preview"
                style={{
                  width: "100%",
                  maxHeight: "260px",
                  objectFit: "cover",
                  borderRadius: "16px",
                  border: "1px solid var(--glass-border)",
                }}
              />
              <button
                onClick={reset}
                title="تغيير الصورة"
                style={{
                  position: "absolute",
                  top: "10px",
                  left: "10px",
                  background: "rgba(0,0,0,0.55)",
                  color: "white",
                  border: "none",
                  borderRadius: "50%",
                  width: "34px",
                  height: "34px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backdropFilter: "blur(6px)",
                }}
              >
                <svg
                  width="16"
                  height="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
                  />
                </svg>
              </button>
            </div>
          )}

          {/* Hidden inputs */}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            onChange={onFileInput}
            style={{ display: "none" }}
          />
          <input
            ref={cameraInput}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFileInput}
            style={{ display: "none" }}
          />

          {/* Error message */}
          {error && (
            <div
              style={{
                width: "100%",
                padding: "12px 16px",
                borderRadius: "12px",
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#dc2626",
                fontSize: "13px",
                marginBottom: "16px",
                textAlign: "center",
              }}
            >
              {error}
            </div>
          )}

          {/* Action Buttons */}
          {!preview ? (
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <button
                className="btn-primary"
                style={{ width: "100%", height: "52px", fontSize: "16px" }}
                onClick={() => cameraInput.current?.click()}
              >
                <svg
                  width="20"
                  height="20"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z"
                  />
                </svg>
                صور اكلك
              </button>

              <button
                className="btn-outline"
                style={{ width: "100%", height: "52px", fontSize: "15px" }}
                onClick={() => fileInput.current?.click()}
              >
                <svg
                  width="18"
                  height="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                  />
                </svg>
                اختر من المعرض
              </button>
            </div>
          ) : (
            <div
              style={{
                width: "100%",
                display: "flex",
                flexDirection: "column",
                gap: "10px",
              }}
            >
              {/* Loading state */}
              {loading && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px 0",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div className="spinner" />
                  <p
                    style={{ color: "var(--text-secondary)", fontSize: "14px" }}
                  >
                    جاري تحليل طبقك...
                  </p>
                </div>
              )}

              {!loading && (
                <>
                  {!isLoaded ? null : !isSignedIn ? (
                    <div
                      style={{
                        textAlign: "center",
                        color: "var(--text-secondary)",
                        fontSize: "13px",
                      }}
                    >
                      <p style={{ marginBottom: "10px" }}>
                        لازم تسجل دخول عشان تحلل الطبق وتحفظه
                      </p>
                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          justifyContent: "center",
                        }}
                      >
                        <button
                          className="btn-primary"
                          style={{ padding: "10px 20px", fontSize: "14px" }}
                          onClick={() =>
                            document.dispatchEvent(
                              new Event("clerk:open-sign-in"),
                            )
                          }
                        >
                          تسجيل الدخول
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      className="btn-primary"
                      style={{
                        width: "100%",
                        height: "52px",
                        fontSize: "16px",
                      }}
                      onClick={analyzeFood}
                      disabled={loading}
                    >
                      <svg
                        width="18"
                        height="18"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
                        />
                      </svg>
                      حلّل الطبق
                    </button>
                  )}

                  <button
                    className="btn-outline"
                    style={{ width: "100%", height: "44px", fontSize: "14px" }}
                    onClick={reset}
                  >
                    تغيير الصورة
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Result Card ─────────────────────────────────────────────────── */}
      {result && (
        <div
          className="glass-card fade-in"
          style={{
            width: "100%",
            maxWidth: "520px",
            padding: "0 0 28px",
            overflow: "hidden",
          }}
        >
          {/* Food image + confidence badge */}
          {preview && (
            <div style={{ position: "relative" }}>
              <img
                src={preview}
                alt={result.foodNameArabic || result.foodName}
                style={{
                  width: "100%",
                  height: "220px",
                  objectFit: "cover",
                  display: "block",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  top: "12px",
                  right: "12px",
                  display: "flex",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
                {/* Tabaqi badge */}
                <span
                  className="font-english"
                  style={{
                    background: "rgba(124,58,237,0.85)",
                    color: "white",
                    fontSize: "11px",
                    fontWeight: 600,
                    padding: "4px 10px",
                    borderRadius: "20px",
                    backdropFilter: "blur(8px)",
                  }}
                >
                  Tabaqi AI
                </span>

                {conf && (
                  <span
                    className={`confidence-badge ${conf.cls}`}
                    style={{ backdropFilter: "blur(8px)" }}
                  >
                    ✓ {conf.pct}
                  </span>
                )}
              </div>
            </div>
          )}

          <div style={{ padding: "24px 24px 0" }}>
            {/* Food name */}
            <h2
              className="font-arabic fade-in"
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: "8px",
              }}
            >
              {result.foodNameArabic || result.foodName || "طبق غير معروف"}
            </h2>

            {/* Description */}
            {result.descriptionArabic && (
              <p
                className="fade-in fade-in-delay-1"
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  marginBottom: "20px",
                  lineHeight: 1.6,
                }}
              >
                {result.descriptionArabic}
              </p>
            )}

            {/* Low confidence disclaimer */}
            {result.confidence === "low" && (
              <div
                className="fade-in"
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  background: "rgba(245,158,11,0.08)",
                  border: "1px solid rgba(245,158,11,0.2)",
                  color: "#b45309",
                  fontSize: "12px",
                  marginBottom: "16px",
                }}
              >
                ⚠️ القيم دي تقديرية وممكن تكون مش دقيقة جداً بسبب جودة الصورة أو
                التنوع في طريقة التحضير.
              </div>
            )}

            {/* Calories — large featured card */}
            <div
              className="macro-card macro-card-calories fade-in"
              style={{
                marginBottom: "12px",
                padding: "18px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                textAlign: "right",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    opacity: 0.7,
                    marginBottom: "4px",
                  }}
                >
                  السعرات الحرارية
                </div>
                <div
                  className="font-english"
                  style={{
                    fontSize: "38px",
                    fontWeight: 700,
                    lineHeight: 1,
                    color: "var(--color-calories)",
                  }}
                >
                  {result.calories ?? "—"}
                  <span
                    style={{
                      fontSize: "16px",
                      fontWeight: 400,
                      marginRight: "4px",
                    }}
                  >
                    kcal
                  </span>
                </div>
              </div>
              <div style={{ fontSize: "36px" }}>🔥</div>
            </div>

            {/* Macro grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "10px",
                marginBottom: "20px",
              }}
            >
              <MacroCard
                emoji="💪"
                label="بروتين"
                value={result.protein}
                unit="g"
                colorClass="macro-card-protein"
                delay={1}
              />
              <MacroCard
                emoji="🍚"
                label="كربوهيدرات"
                value={result.carbs}
                unit="g"
                colorClass="macro-card-carbs"
                delay={2}
              />
              <MacroCard
                emoji="🥑"
                label="دهون"
                value={result.fats}
                unit="g"
                colorClass="macro-card-fats"
                delay={3}
              />
            </div>

            {/* Portion info */}
            {result.portion?.size && (
              <div
                className="fade-in fade-in-delay-4"
                style={{
                  display: "flex",
                  gap: "16px",
                  padding: "12px 16px",
                  borderRadius: "12px",
                  background: "var(--bg-subtle)",
                  marginBottom: "20px",
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                }}
              >
                <span>📏 الحجم: {result.portion.size}</span>
                {result.portion.estimatedGrams && (
                  <span>⚖️ تقريباً {result.portion.estimatedGrams}g</span>
                )}
              </div>
            )}

            {/* Ingredients */}
            {result.ingredients?.length > 0 && (
              <div
                className="fade-in fade-in-delay-4"
                style={{ marginBottom: "20px" }}
              >
                <h3
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: "10px",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  المكونات
                </h3>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  {result.ingredients.map((ing, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 12px",
                        borderRadius: "10px",
                        background: "var(--bg-subtle)",
                        fontSize: "12px",
                        color: "var(--text-primary)",
                      }}
                    >
                      <span
                        style={{ color: "var(--text-secondary)" }}
                        className="font-english"
                      >
                        {ing.estimatedGrams ? `${ing.estimatedGrams}g` : ""} ·{" "}
                        {ing.calories ? `${ing.calories} kcal` : ""}
                      </span>
                      <span style={{ fontWeight: 500 }}>
                        {ing.nameArabic || ing.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Saved confirmation */}
            {saved && (
              <div
                className="fade-in"
                style={{
                  textAlign: "center",
                  padding: "10px",
                  borderRadius: "10px",
                  background: "rgba(34,197,94,0.08)",
                  border: "1px solid rgba(34,197,94,0.2)",
                  color: "#16a34a",
                  fontSize: "13px",
                  marginBottom: "16px",
                }}
              >
                ✅ تم تسجيل الوجبة في سجلك
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="btn-primary"
                style={{ flex: 1, height: "48px", fontSize: "14px" }}
                onClick={() => (window.location.href = "/history")}
              >
                <svg
                  width="17"
                  height="17"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                عرض السجل
              </button>
              <button
                className="btn-outline"
                style={{ flex: 1, height: "48px", fontSize: "14px" }}
                onClick={reset}
              >
                تحليل طبق آخر
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
