"use client";

import { useState } from "react";

export default function TestAI() {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);

  const [result, setResult] = useState(null);

  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setImage(file);

    setPreview(URL.createObjectURL(file));

    setResult(null);

    setError("");
  }

  async function analyzeFood() {
    if (!image) {
      setError("اختار صورة أكل الأول.");
      return;
    }

    try {
      setLoading(true);

      setError("");

      setResult(null);

      const formData = new FormData();

      formData.append("image", image);

      const response = await fetch("/api/analyze-food", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "حصلت مشكلة أثناء التحليل."
        );
      }

      setResult(data.result);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "40px",
        fontFamily: "Arial",
      }}
    >
      <h1>Tabaqi AI Test</h1>

      <p>
        جرّب تحليل صورة أكل مصري
      </p>

      <input
        type="file"
        accept="image/*"
        onChange={handleImageChange}
      />

      {preview && (
        <div style={{ marginTop: "20px" }}>
          <img
            src={preview}
            alt="Food preview"
            style={{
              width: "300px",
              maxWidth: "100%",
              borderRadius: "16px",
            }}
          />
        </div>
      )}

      <button
        onClick={analyzeFood}
        disabled={!image || loading}
        style={{
          marginTop: "20px",
          padding: "12px 20px",
          borderRadius: "10px",
          border: "none",
          cursor: loading ? "wait" : "pointer",
        }}
      >
        {loading
          ? "جاري تحليل الطبق..."
          : "حلّل الطبق"}
      </button>

      {error && (
        <p
          style={{
            color: "red",
            marginTop: "20px",
          }}
        >
          {error}
        </p>
      )}

      {result && (
        <div
          style={{
            marginTop: "30px",
            padding: "20px",
            background: "#f3f3f3",
            borderRadius: "16px",
            maxWidth: "600px",
          }}
        >
          <h2>
            {result.foodNameArabic ||
              result.foodName}
          </h2>

          <p>
            {result.descriptionArabic}
          </p>

          <hr />

          <p>
            🔥 السعرات:{" "}
            {result.calories} kcal
          </p>

          <p>
            💪 البروتين:{" "}
            {result.protein} g
          </p>

          <p>
            🍚 الكربوهيدرات:{" "}
            {result.carbs} g
          </p>

          <p>
            🥑 الدهون:{" "}
            {result.fats} g
          </p>

          <p>
            📏 الكمية:{" "}
            {result.portion?.size}
          </p>

          <p>
            ⚖️ الوزن التقريبي:{" "}
            {result.portion?.estimatedGrams} g
          </p>

          <p>
            🎯 دقة التعرف:{" "}
            {result.confidence}
          </p>

          <h3>المكونات</h3>

          <ul>
            {result.ingredients?.map(
              (ingredient, index) => (
                <li key={index}>
                  <strong>
                    {ingredient.nameArabic ||
                      ingredient.name}
                  </strong>

                  {" — "}

                  {ingredient.estimatedGrams}g

                  {" | "}

                  💪 {ingredient.protein}g
                  {" | "}
                  🍚 {ingredient.carbs}g
                  {" | "}
                  🥑 {ingredient.fats}g
                </li>
              )
            )}
          </ul>
        </div>
      )}
    </main>
  );
}