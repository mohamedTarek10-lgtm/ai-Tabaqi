"use client";

import { useEffect, useSyncExternalStore } from "react";

function getSystemTheme() {
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getInitialTheme() {
  if (typeof window === "undefined") return "dark";
  return localStorage.getItem("luqmati-theme") || getSystemTheme();
}

function subscribeToTheme(callback) {
  window.addEventListener("luqmati:theme", callback);
  return () => window.removeEventListener("luqmati:theme", callback);
}

function getThemeSnapshot() {
  return getInitialTheme();
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => "dark");

  useEffect(() => {
    const initial = getInitialTheme();
    applyTheme(initial, false);
  }, []);

  function applyTheme(next, animate = true) {
    const root = document.documentElement;
    if (animate) {
      root.classList.add("theme-transitioning");
      setTimeout(() => root.classList.remove("theme-transitioning"), 300);
    }
    root.dataset.theme = next;
    const themeMeta = document.getElementById("theme-color-meta");
    if (themeMeta) themeMeta.setAttribute("content", next === "dark" ? "#06040f" : "#f0f0fa");
    // Keep the canvas/CSS background in sync with the explicit theme toggle.
    window.dispatchEvent(new CustomEvent("luqmati:theme", { detail: { theme: next } }));
  }

  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    localStorage.setItem("luqmati-theme", next);
    applyTheme(next, true);
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
