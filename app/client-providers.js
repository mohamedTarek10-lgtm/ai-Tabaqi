"use client";

import { useState, useEffect } from "react";
import RibbonBackground from "./ribbon-background";
import { LangProvider } from "./i18n-context";

export default function ClientProviders({ children }) {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    // Initial theme check
    const currentTheme = document.documentElement.dataset.theme || "dark";
    setIsDark(currentTheme === "dark");

    // Listen to theme toggle events
    const handleThemeChange = (e) => {
      setIsDark(e.detail?.theme === "dark");
    };

    window.addEventListener("luqmati:theme", handleThemeChange);
    return () => window.removeEventListener("luqmati:theme", handleThemeChange);
  }, []);

  return (
    <LangProvider>
      <RibbonBackground isDark={isDark} />
      {children}
    </LangProvider>
  );
}
