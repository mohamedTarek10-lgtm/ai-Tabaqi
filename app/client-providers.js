"use client";

import { useSyncExternalStore } from "react";
import RibbonBackground from "./ribbon-background";
import { LangProvider } from "./i18n-context";

function subscribeToTheme(callback) {
  window.addEventListener("luqmati:theme", callback);
  return () => window.removeEventListener("luqmati:theme", callback);
}

function getThemeIsDark() {
  return (document.documentElement.dataset.theme || "dark") === "dark";
}

export default function ClientProviders({ children }) {
  const isDark = useSyncExternalStore(subscribeToTheme, getThemeIsDark, () => true);

  return (
    <LangProvider>
      <RibbonBackground isDark={isDark} />
      {children}
    </LangProvider>
  );
}
