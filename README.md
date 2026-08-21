# Luqmati

This app is a Next.js food-analysis experience with Clerk auth, Neon/Postgres persistence, and OpenRouter AI analysis.

## Environment setup

Create a `.env` file with the required values:

```bash
DATABASE_URL=postgresql://...
OPENROUTER_API_KEY=sk-or-...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_live_key
CLERK_SECRET_KEY=sk_live_your_live_key
ADMIN_EMAILS=you@example.com,admin@example.com
```

Important: before deployment, replace any test Clerk values (`pk_test_...` / `sk_test_...`) with the live production keys. The build will fail in production if a test publishable key is still configured.

## Admin access

Set `ADMIN_EMAILS` to a comma-separated list of admin emails. Only users whose Clerk email matches one of these addresses can access `/admin` and see the analytics dashboard.

## Production key swap checklist

1. Copy the live keys from your Clerk dashboard.
2. Update `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
3. Restart the app and verify the browser no longer shows the development-key warning.

## Local development

```bash
npm install
npm run dev
```

The app runs at `http://localhost:3002` by default.

## Notes

- The app includes a global CSP, a secure admin redirect, and a non-invasive visit counter that hashes client IP + UA before storing a unique visitor hash.
- The AI route compresses images client-side before sending to OpenRouter and applies a hard timeout plus retry logic for transient failures.
