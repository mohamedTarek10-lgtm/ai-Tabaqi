"use client";

export default function RibbonBackground({ isDark }) {
  return (
    <div className={`luqmati-bg ${isDark ? "is-dark" : "is-light"}`} aria-hidden="true">
      <div className="luqmati-bg-base" />
      <div className="luqmati-bg-ribbon luqmati-bg-ribbon-one" />
      <div className="luqmati-bg-ribbon luqmati-bg-ribbon-two" />
      <div className="luqmati-bg-ribbon luqmati-bg-ribbon-three" />
      <div className="luqmati-bg-glow luqmati-bg-glow-one" />
      <div className="luqmati-bg-glow luqmati-bg-glow-two" />
      <div className="luqmati-bg-grain" />
      <div className="luqmati-bg-overlay" />
    </div>
  );
}
