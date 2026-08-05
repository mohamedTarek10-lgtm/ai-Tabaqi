import { ClerkProvider, SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Tabaqi — اعرف أكلك فيه إيه",
  description: "صوّر طبقك واعرف السعرات والماكروز تلقائياً بواسطة الذكاء الاصطناعي",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#7c3aed" />
      </head>
      <body>
        <ClerkProvider>
          {/* Animated background blobs */}
          <div className="tabaqi-bg" aria-hidden="true">
            <div className="tabaqi-blob tabaqi-blob-1" />
            <div className="tabaqi-blob tabaqi-blob-2" />
            <div className="tabaqi-blob tabaqi-blob-3" />
          </div>

          {/* Desktop Top Navbar — hidden on mobile */}
          <header
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 40,
              display: "none",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 40px",
              height: "64px",
              background: "var(--nav-bg)",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              borderBottom: "1px solid var(--nav-border)",
            }}
            className="desktop-nav"
          >
            {/* Right: Brand */}
            <div
              className="font-english"
              style={{
                fontSize: "26px",
                fontWeight: 600,
                color: "var(--brand)",
                letterSpacing: "-0.5px",
                userSelect: "none",
              }}
            >
              Tabaqi
            </div>

            {/* Center: Navigation links */}
            <nav style={{ display: "flex", gap: "32px", alignItems: "center" }}>
              <Link href="/" style={navLinkStyle}>الرئيسية</Link>
              <Link href="/history" style={navLinkStyle}>السجل</Link>
              <Link href="/profile" style={navLinkStyle}>الملف</Link>
            </nav>

            {/* Left: Auth */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
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
                    دخول
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="btn-primary" style={{ padding: "7px 16px", fontSize: "13px" }}>
                    حساب جديد
                  </button>
                </SignUpButton>
              </Show>
              <Show when="signed-in">
                <UserButton />
              </Show>
            </div>
          </header>

          {/* Page Content */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              minHeight: "100dvh",
              paddingBottom: "80px", /* space for bottom nav on mobile */
            }}
            className="page-wrapper"
          >
            {children}
          </div>

          {/* Mobile Bottom Navigation */}
          <nav className="bottom-nav mobile-only" aria-label="التنقل الرئيسي">
            <Link href="/" className="bottom-nav-item" id="nav-home">
              <span className="nav-icon-wrap">
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9.75L12 3l9 6.75V21a.75.75 0 01-.75.75H15.75a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H3.75A.75.75 0 013 21V9.75z" />
                </svg>
              </span>
              <span>الرئيسية</span>
            </Link>

            <Link href="/history" className="bottom-nav-item" id="nav-history">
              <span className="nav-icon-wrap">
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </span>
              <span>السجل</span>
            </Link>

            <Link href="/" className="bottom-nav-item nav-add" id="nav-add">
              <span className="nav-icon-wrap">
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </span>
              <span>إضافة</span>
            </Link>

            <Link href="/profile" className="bottom-nav-item" id="nav-profile">
              <span className="nav-icon-wrap">
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </span>
              <span>الملف</span>
            </Link>
          </nav>

          {/* Active nav highlighting script */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  var path = window.location.pathname;
                  var map = { '/': 'nav-home', '/history': 'nav-history', '/profile': 'nav-profile' };
                  var id = map[path] || 'nav-home';
                  var el = document.getElementById(id);
                  if (el) el.classList.add('active');
                })();
              `,
            }}
          />

          {/* Responsive: show desktop nav on large screens */}
          <style>{`
            @media (min-width: 768px) {
              .desktop-nav { display: flex !important; }
              .mobile-only { display: none !important; }
              .page-wrapper { padding-top: 64px; padding-bottom: 0; }
            }
          `}</style>
        </ClerkProvider>
      </body>
    </html>
  );
}

const navLinkStyle = {
  fontSize: "14px",
  fontWeight: 500,
  color: "var(--text-secondary)",
  textDecoration: "none",
  transition: "color 0.2s",
};
