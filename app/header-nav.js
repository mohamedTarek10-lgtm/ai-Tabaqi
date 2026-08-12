"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import ThemeToggle from "./theme-toggle";
import { useLang } from "./i18n-context";

export function HeaderNav() {
  const pathname = usePathname();
  const { lang, t, toggleLang } = useLang();

  const navLinkStyle = (path) => ({
    fontSize: "14px",
    fontWeight: pathname === path ? 700 : 500,
    color: pathname === path ? "var(--brand)" : "var(--text-secondary)",
    textDecoration: "none",
    transition: "color 0.2s",
  });

  return (
    <>
      {/* Mobile Header */}
      <header className="mobile-header mobile-only">
        <Link href="/" className="mobile-brand" aria-label="Luqmati لقمتي" style={{ textDecoration: "none" }}>
          <span className="font-arabic">لقمتي</span>
          <span className="font-english">Luqmati</span>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            className="lang-toggle"
            onClick={toggleLang}
            title={lang === "ar" ? "English" : "عربي"}
          >
            {lang === "ar" ? "EN" : "عربي"}
          </button>
          <ThemeToggle />
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </header>

      {/* Desktop Header */}
      <header className="desktop-nav">
        <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "baseline", gap: "8px" }}>
          <span className="font-arabic" style={{ fontSize: "26px", fontWeight: 700, color: "var(--brand)" }}>
            لقمتي
          </span>
          <span className="font-english" style={{ fontSize: "20px", fontWeight: 600, color: "var(--brand)", letterSpacing: "-0.5px" }}>
            Luqmati
          </span>
        </Link>

        <nav style={{ display: "flex", gap: "32px", alignItems: "center" }}>
          <Link href="/" style={navLinkStyle("/")}>{t.home}</Link>
          <Link href="/history" style={navLinkStyle("/history")}>{t.history}</Link>
          <Link href="/profile" style={navLinkStyle("/profile")}>{t.profile}</Link>
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            className="lang-toggle"
            onClick={toggleLang}
            title={lang === "ar" ? "English" : "عربي"}
          >
            {lang === "ar" ? "EN" : "عربي"}
          </button>
          <ThemeToggle />
          <Show when="signed-out">
            <SignInButton mode="modal">
              <button
                style={{
                  padding: "7px 16px",
                  borderRadius: "10px",
                  border: "1.5px solid var(--glass-border)",
                  background: "transparent",
                  color: "var(--text-primary)",
                  fontSize: "13px",
                  cursor: "pointer",
                  fontWeight: 500,
                }}
              >
                {t.signIn}
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="btn-primary" style={{ padding: "7px 16px", fontSize: "13px" }}>
                {t.signUp}
              </button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </header>
    </>
  );
}

export function FooterBranding() {
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} لقمتي / Luqmati</span>
      <a
        href="https://github.com"
        target="_blank"
        rel="noopener noreferrer"
        className="footer-mt"
        title="Created by MT"
        aria-label="MT Developer Signature"
      >
        MT
      </a>
    </footer>
  );
}
