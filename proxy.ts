import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { isAdminUser } from './lib/auth/isAdmin';

const isAdminRoute = createRouteMatcher(['/admin(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (!isAdminRoute(req)) {
    return NextResponse.next();
  }

  const currentAuth = await auth();
  if (!currentAuth.userId) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  const isAdmin = await isAdminUser(currentAuth);
  if (!isAdmin) {
    return NextResponse.redirect(new URL('/', req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, to keep edge latency minimal
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|otf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest|json)).*)",
    "/(api|trpc)(.*)",
  ],
};
