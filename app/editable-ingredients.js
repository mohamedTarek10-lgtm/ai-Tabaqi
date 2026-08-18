"use client";

import { useState, memo } from "react";

function EditableIngredients({
  initialIngredients,
  lang,
  t,
  onUpdateIngredients,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [newIngName, setNewIngName] = useState("");
  const [newIngGrams, setNewIngGrams] = useState("");
  const [newIngProtein, setNewIngProtein] = useState("");
  const [newIngCalories, setNewIngCalories] = useState("");

  function handleRemoveIngredient(index) {
    const updated = initialIngredients.filter((_, i) => i !== index);
    onUpdateIngredients(updated);
  }

  function handleAddIngredient(e) {
    e.preventDefault();
    if (!newIngName.trim()) return;
    const newIng = {
      name: newIngName,
      nameArabic: newIngName,
      estimatedGrams: Number(newIngGrams) || 0,
      protein: Number(newIngProtein) || 0,
      calories: Number(newIngCalories) || 0,
      carbs: 0,
      fats: 0,
    };
    const updated = [...initialIngredients, newIng];
    onUpdateIngredients(updated);
    setNewIngName("");
    setNewIngGrams("");
    setNewIngProtein("");
    setNewIngCalories("");
  }

  return (
    <div className="fade-in fade-in-delay-4" style={{ marginBottom: "24px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <h3
          style={{
            fontSize: "14px",
            fontWeight: 700,
            color: "var(--text-primary)",
          }}
        >
          {t.ingredients} ({initialIngredients.length})
        </h3>
        <button
          type="button"
          className="btn-outline"
          onClick={() => setIsEditing(!isEditing)}
          style={{
            padding: "4px 10px",
            fontSize: "12px",
            height: "auto",
          }}
        >
          {isEditing ? "إغلاق التعديل" : "تعديل المكونات ✏️"}
        </button>
      </div>

      {/* Ingredients List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {initialIngredients.map((ing, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "10px 14px",
              borderRadius: "12px",
              background: "var(--bg-subtle)",
              fontSize: "13px",
              color: "var(--text-primary)",
            }}
          >
            <div>
              <span style={{ fontWeight: 600 }}>
                {lang === "ar"
                  ? ing.nameArabic || ing.name
                  : ing.name || ing.nameArabic}
              </span>
              {(ing.protein > 0 || ing.calories > 0) && (
                <span
                  style={{
                    fontSize: "11px",
                    color: "var(--text-muted)",
                    marginInlineStart: "8px",
                  }}
                >
                  (💪 {ing.protein || 0}g · 🔥 {ing.calories || 0}kcal)
                </span>
              )}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
              }}
            >
              {ing.estimatedGrams && (
                <span
                  className="english-font"
                  style={{
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                  }}
                >
                  {ing.estimatedGrams}g
                </span>
              )}

              {isEditing && (
                <button
                  type="button"
                  onClick={() => handleRemoveIngredient(i)}
                  style={{
                    background: "rgba(239, 68, 68, 0.15)",
                    color: "#ef4444",
                    border: "none",
                    borderRadius: "6px",
                    padding: "2px 8px",
                    cursor: "pointer",
                    fontSize: "11px",
                  }}
                >
                  حذف ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add New Ingredient Form (Manual Correction) */}
      {isEditing && (
        <form
          onSubmit={handleAddIngredient}
          style={{
            marginTop: "12px",
            padding: "14px",
            borderRadius: "14px",
            border: "1px dashed var(--brand-soft)",
            background: "rgba(124,58,237,0.04)",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <span
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--brand)",
            }}
          >
            إضافة مكون جديد يدويًا
          </span>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "2fr 1fr",
              gap: "8px",
            }}
          >
            <input
              type="text"
              placeholder="اسم المكون (مثال: فراخ)"
              value={newIngName}
              onChange={(e) => setNewIngName(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--glass-border)",
                background: "var(--glass)",
                color: "var(--text-primary)",
                fontSize: "12px",
              }}
            />
            <input
              type="number"
              placeholder="الوزن جرام"
              value={newIngGrams}
              onChange={(e) => setNewIngGrams(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--glass-border)",
                background: "var(--glass)",
                color: "var(--text-primary)",
                fontSize: "12px",
              }}
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
            }}
          >
            <input
              type="number"
              placeholder="البروتين جرام"
              value={newIngProtein}
              onChange={(e) => setNewIngProtein(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--glass-border)",
                background: "var(--glass)",
                color: "var(--text-primary)",
                fontSize: "12px",
              }}
            />
            <input
              type="number"
              placeholder="السعرات"
              value={newIngCalories}
              onChange={(e) => setNewIngCalories(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--glass-border)",
                background: "var(--glass)",
                color: "var(--text-primary)",
                fontSize: "12px",
              }}
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            style={{
              padding: "8px",
              fontSize: "13px",
              marginTop: "4px",
            }}
          >
            + إضافة المكون
          </button>
        </form>
      )}
    </div>
  );
}

export default memo(EditableIngredients);
