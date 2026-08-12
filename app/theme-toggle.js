"use client";

import { useEffect, useState } from "react";

function getSystemTheme() {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  return localStorage.getItem("luqmati-theme") || getSystemTheme();
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const saved = localStorage.getItem("luqmati-theme");
    const initial = saved || getSystemTheme();
    applyTheme(initial, false);
    setTheme(initial);
  }, []);

  function applyTheme(next, animate = true) {
    const root = document.documentElement;
    if (animate) {
      root.classList.add("theme-transitioning");
      setTimeout(() => root.classList.remove("theme-transitioning"), 450);
    }
    root.dataset.theme = next;
    // Dispatch event so RibbonBackground can react
    root.dispatchEvent(new CustomEvent("luqmati:theme", { detail: { theme: next } }));
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    applyTheme(next, true);
    localStorage.setItem("luqmati-theme", next);
    setTheme(next);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Light mode" : "Dark mode"}
    >
      {isDark ? "☀" : "☾"}
    </button>
  );
}
