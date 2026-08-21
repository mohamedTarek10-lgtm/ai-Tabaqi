/** @type {import('next').NextConfig} */
const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";

if (process.env.NODE_ENV === "production" && clerkPublishableKey.startsWith("pk_test_")) {
  throw new Error(
    "Production build detected a test Clerk publishable key (pk_test_...). Set NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY to the production key before deploying."
  );
}

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "object-src 'none'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.com https://*.clerk.dev https://*.clerk.accounts.dev https://*.openrouter.ai https://openrouter.ai",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https://*.clerk.com https://*.clerk.dev https://*.clerk.accounts.dev https://*.openrouter.ai https://openrouter.ai https://images.unsplash.com https://*.googleusercontent.com",
  "font-src 'self' data: https://fonts.gstatic.com https://fonts.googleapis.com",
  "connect-src 'self' https://*.clerk.com https://*.clerk.dev https://*.clerk.accounts.dev https://clerk-telemetry.com https://*.clerk-telemetry.com https://*.openrouter.ai https://openrouter.ai https://*.neon.tech https://*.aws.neon.tech https://*.amazonaws.com",
  "media-src 'self' data: blob:",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "frame-src 'self' https://*.clerk.com https://*.clerk.dev https://*.clerk.accounts.dev",
  "manifest-src 'self'",
].join("; ");

const nextConfig = {
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error", "warn"] } : false,
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    optimizePackageImports: ["@clerk/nextjs", "lucide-react"],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Content-Security-Policy", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;

