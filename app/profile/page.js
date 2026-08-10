"use client";

import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function ProfilePage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [mealCount, setMealCount] = useState(null);

  useEffect(() => {
    if (!isSignedIn) return;

    let isMounted = true;
    fetch("/api/meals")
      .then((r) => r.json())
      .then((d) => {
        if (isMounted) {
          setMealCount(d.meals?.length ?? 0);
        }
      })
      .catch((err) => {
        console.error("Failed to fetch meals:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [isSignedIn]);

  // 1. حالة التحميل
  if (!isLoaded) {
    return (
      <div
        style={{
          minHeight: "80dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  // 2. حالة عدم تسجيل الدخول
  if (!isSignedIn) {
    return (
      <div
        style={{
          minHeight: "80dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <div
          className="glass-card"
          style={{ padding: "40px 32px", maxWidth: "360px", width: "100%" }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>👤</div>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: 700,
              color: "var(--text-primary)",
              marginBottom: "10px",
            }}
          >
            انت ليه مش مسجل دخول معانا
          </h2>
          <p
            style={{
              fontSize: "14px",
              color: "var(--text-secondary)",
              marginBottom: "24px",
            }}
          >
            سجل دخول عشان تشوف كل تفاصيل وجبتك مجانا
          </p>
          <SignInButton mode="modal">
            <button
              className="btn-primary"
              style={{ width: "100%", height: "48px", fontSize: "15px", cursor: "pointer" }}
            >
              سجل دخول
            </button>
          </SignInButton>
        </div>
      </div>
    );
  }

  // 3. حالة المستخدم المسجل
  return (
    <div style={{ minHeight: "80dvh", padding: "24px 16px" }}>
      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        <h1
          className="font-arabic"
          style={{
            fontSize: "26px",
            fontWeight: 700,
            color: "var(--text-primary)",
            marginBottom: "24px",
          }}
        >
          الملف الشخصي
        </h1>

        {/* كارت البيانات الشخصية */}
        <div
          className="glass-card fade-in"
          style={{
            padding: "28px 24px",
            marginBottom: "16px",
            display: "flex",
            alignItems: "center",
            gap: "20px",
          }}
        >
          <div>
            <UserButton afterSignOutUrl="/" />
          </div>

          <div style={{ flex: 1 }}>
            <p
              style={{
                fontWeight: 700,
                fontSize: "17px",
                color: "var(--text-primary)",
                marginBottom: "4px",
              }}
            >
              {user?.fullName || user?.username || "مستخدم طبقي"}
            </p>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
              {user?.primaryEmailAddress?.emailAddress}
            </p>
          </div>
        </div>

        {/* كارت الإحصائيات */}
        <div
          className="glass-card fade-in fade-in-delay-1"
          style={{ padding: "20px 24px", marginBottom: "16px" }}
        >
          <p
            style={{
              fontSize: "12px",
              fontWeight: 600,
              color: "var(--text-muted)",
              marginBottom: "14px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            إحصائياتك
          </p>
          <div style={{ display: "flex", gap: "32px" }}>
            <div style={{ textAlign: "center" }}>
              <div
                className="font-english"
                style={{
                  fontSize: "32px",
                  fontWeight: 700,
                  color: "var(--brand)",
                }}
              >
                {mealCount ?? "…"}
              </div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                وجبة مسجلة
              </div>
            </div>
          </div>
        </div>

        {/* الروابط السريعة */}
        <div
          className="glass-card fade-in fade-in-delay-2"
          style={{ padding: "8px" }}
        >
          <Link
            href="/history"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 16px",
              borderRadius: "12px",
              textDecoration: "none",
              color: "var(--text-primary)",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--bg-subtle)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="var(--brand)"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span style={{ fontSize: "14px", fontWeight: 500 }}>
              سجل الوجبات
            </span>
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="2"
              viewBox="0 0 24 24"
              style={{ marginInlineStart: "auto" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
          </Link>

          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "14px 16px",
              borderRadius: "12px",
              textDecoration: "none",
              color: "var(--text-primary)",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--bg-subtle)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <svg
              width="20"
              height="20"
              fill="none"
              stroke="var(--brand)"
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
            <span style={{ fontSize: "14px", fontWeight: 500 }}>
              حلّل طبق جديد
            </span>
            <svg
              width="16"
              height="16"
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth="2"
              viewBox="0 0 24 24"
              style={{ marginInlineStart: "auto" }}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5L8.25 12l7.5-7.5"
              />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}