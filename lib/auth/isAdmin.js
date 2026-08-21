import { auth, clerkClient } from "@clerk/nextjs/server";

export function getAdminEmails() {
  const raw = process.env.ADMIN_EMAILS || "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email) {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return getAdminEmails().includes(normalized);
}

export async function isAdminUser(authContext = null) {
  const currentAuth = authContext ?? (await auth());
  const sessionClaims = currentAuth?.sessionClaims || {};
  const emailFromClaims = sessionClaims.email || sessionClaims.primaryEmail || sessionClaims.emailAddress || "";

  if (isAdminEmail(emailFromClaims)) {
    return true;
  }

  const userId = currentAuth?.userId;
  if (!userId) return false;

  try {
    const user = await clerkClient.users.getUser(userId);
    const primaryEmail = user?.emailAddresses?.find((item) => item.id === user.primaryEmailAddressId)?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || "";
    if (isAdminEmail(primaryEmail)) return true;
  } catch (error) {
    console.warn("[Luqmati] Could not resolve admin email from Clerk user.", error);
  }

  return false;
}
