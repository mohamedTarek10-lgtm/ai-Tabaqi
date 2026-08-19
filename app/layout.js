import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import ClientProviders from "./client-providers";
import { HeaderNav, FooterBranding } from "./header-nav";
import MobileNavigation from "./mobile-navigation";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const arabicBrand = localFont({
  src: "../public/fonts/arabicFont/alfont_com_InkBrushArabic_DEMO-Textured.otf",
  variable: "--font-arabic",
  display: "swap",
});

const metana = localFont({
  src: [
    {
      path: "../public/fonts/englishFontbtn/NeueMetanaMono-Light.otf",
      weight: "300 500",
      style: "normal",
    },
    {
      path: "../public/fonts/englishFontbtn/NeueMetanaMono-SemiBold.otf",
      weight: "600 800",
      style: "normal",
    },
  ],
  variable: "--font-metana",
  display: "swap",
});

export const metadata = {
  verification: {
    google: "tQuHl7PaMtPtA0W1vUPDpH3JeK3RY71DOMQi99ZF9gE",
  },
  title: {
    default: "لقمتي / Luqmati — تحليل السعرات والماكروز بالذكاء الاصطناعي",
    template: "%s | لقمتي Luqmati",
  },
  description: "صوّر طبقك واعرف السعرات الحرارية والبروتين والماكروز فوراً بواسطة الذكاء الاصطناعي للأكلات المصرية والعربية — Snap your food and analyze macros instantly with AI.",
  keywords: [
    "Luqmati",
    "لقمتي",
    "تحليل الأكل",
    "حساب السعرات",
    "الماكروز",
    "الذكاء الاصطناعي",
    "أكل مصري",
    "macro counter",
    "food AI analyzer",
    "Egyptian food calories",
  ],
  authors: [{ name: "MT" }],
  creator: "MT",
  publisher: "Luqmati",
  metadataBase: new URL("https://luqmati.app"),
  alternates: {
    canonical: "/",
    languages: {
      "ar-EG": "/",
      "en-US": "/?lang=en",
    },
  },
  openGraph: {
    title: "لقمتي / Luqmati — اعرف أكلك فيه إيه بالذكاء الاصطناعي",
    description: "تطبيق لقمتي لتحليل الأكل والسعرات والبروتين بدقة فائقة للأكلات المصرية والعالمية",
    url: "https://luqmati.app",
    siteName: "Luqmati لقمتي",
    locale: "ar_EG",
    type: "website",
    images: [
      {
        url: "/icon-512.png",
        width: 512,
        height: 512,
        alt: "لقمتي Luqmati AI Food Analyzer",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "لقمتي / Luqmati — AI Food & Macro Analyzer",
    description: "صوّر طبقك واعرف السعرات والبروتين والماكروز تلقائياً",
    creator: "@LuqmatiApp",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
    },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "لقمتي Luqmati",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "لقمتي / Luqmati",
    alternateName: "Luqmati",
    url: "https://luqmati.app",
    applicationCategory: "HealthApplication",
    operatingSystem: "All",
    description: "AI powered food and macro nutrition analyzer tailored for Egyptian and international meals.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EGP",
    },
  };

  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning className={[inter.variable, arabicBrand.variable, metana.variable].join(" ")} style={{ scrollBehavior: "smooth" }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta id="theme-color-meta" name="theme-color" content="#000000" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f5f7f3" />
        <Script
          id="json-ld"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        <ClerkProvider>
          <ClientProviders>
            <HeaderNav />

            {/* Main Wrapper */}
            <div className="page-wrapper" style={{ position: "relative", zIndex: 1, minHeight: "100dvh" }}>
              {children}
            </div>

            <FooterBranding />

            {/* Mobile Bottom Navigation */}
            <MobileNavigation />
          </ClientProviders>
        </ClerkProvider>

        {/* Register Service Worker for PWA & Offline Support using Next.js Script */}
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function(err) {
                    console.log('SW registration failed: ', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
