import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware()

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, to keep edge latency minimal
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|otf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|json)).*)",
    "/(api|trpc)(.*)",
  ],
}
