"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { useLang } from "./i18n-context";

export default function InstallPrompt() {
  const { t, lang } = useLang();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const isStandalone = useSyncExternalStore(
    () => () => {},
    () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true,
    () => false,
  );

  useEffect(() => {
    // Check if already running as installed standalone app
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    ) {
      return;
    }

    // Listen for native Android/Desktop install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
  }, []);

  // Detect iOS Safari
  const isIOS =
    typeof window !== "undefined" &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !window.MSStream;

  async function handleInstallClick() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    } else if (isIOS) {
      setShowIOSHint(true);
    } else {
      // Fallback hint for other browsers
      alert(
        lang === "ar"
          ? "لتثبيت التطبيق: افتح قائمة المتصفح واختر 'إضافة إلى الشاشة الرئيسية' أو 'Install App'."
                  : "To install: open your browser menu and select ‘Add to Home Screen’ or ‘Install App’.",
      );
    }
  }

  // Hide if already running in standalone PWA mode
  if (isStandalone) return null;

  return (
    <>
      {/* Install Button Trigger */}
      {(deferredPrompt || isIOS) && (
        <div
          className="fade-in"
          style={{
            width: "100%",
            maxWidth: "520px",
            marginBottom: "16px",
          }}
        >
          <div
            className="glass-card"
            style={{
              padding: "12px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "12px",
              background:
                "linear-gradient(135deg, rgb(108 63 212 / 0.16), rgb(236 72 153 / 0.12))",
              borderColor: "rgb(167 139 250 / 0.3)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "10px",
                  background: "var(--brand)",
                  color: "#fff",
                  display: "grid",
                  placeItems: "center",
                  fontSize: "18px",
                  flexShrink: 0,
                  boxShadow: "0 4px 12px rgb(108 63 212 / 0.3)",
                }}
              >
                📱
              </div>
              <div style={{ textAlign: lang === "ar" ? "right" : "left" }}>
                <p
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--text-primary)",
                  }}
                >
                  {lang === "ar"
                    ? "نزل تطبيق لقمتي على موبايلك"
                    : "Install Luqmati App"}
                </p>
                <p style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                  {lang === "ar"
                    ? "استخدمه كـ تطبيق سريع وبدون إنترنت"
                    : "Use it as a fast mobile app"}
                </p>
              </div>
            </div>

            <button
              onClick={handleInstallClick}
              className="btn-primary"
              style={{
                padding: "8px 14px",
                fontSize: "12px",
                borderRadius: "10px",
                flexShrink: 0,
                cursor: "pointer",
              }}
            >
              {lang === "ar" ? "تثبيت التطبيق" : "Install App"}
            </button>
          </div>
        </div>
      )}

      {/* iOS Instructions Modal */}
      {showIOSHint && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(0,0,0,0.65)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setShowIOSHint(false)}
        >
          <div
            className="glass-card fade-in"
            style={{
              width: "100%",
              maxWidth: "420px",
              padding: "24px",
              background: "var(--background)",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontSize: "36px", marginBottom: "10px" }}>📲</div>
            <h3
              style={{
                fontSize: "18px",
                fontWeight: 700,
                marginBottom: "10px",
                color: "var(--text-primary)",
              }}
            >
              {lang === "ar"
                ? "تثبيت لقمتي على أيفون (iOS)"
                : "Install on iPhone (iOS)"}
            </h3>
            <div
              style={{
                fontSize: "13px",
                color: "var(--text-secondary)",
                lineHeight: 1.6,
                textAlign: "right",
                marginBottom: "20px",
              }}
            >
              <p style={{ marginBottom: "8px" }}>
                1️⃣ اضغط على زر المشاركة <strong>(Share ⎋)</strong> في أسفل متصفح
                Safari.
              </p>
              <p>
                2️⃣ اختر{" "}
                <strong>
                  &quot;إضافة إلى الشاشة الرئيسية&quot; (Add to Home Screen ➕)
                </strong>
                .
              </p>
            </div>
            <button
              className="btn-primary"
              style={{ width: "100%", height: "44px", fontSize: "14px" }}
              onClick={() => setShowIOSHint(false)}
            >
              {lang === "ar" ? "فهمت" : "Got it"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
