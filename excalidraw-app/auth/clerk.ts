import { Clerk } from "@clerk/clerk-js";

const DEFAULT_ALLOWED_EMAILS = [
  "shubhsoch@gmail.com",
  "shubhamcse12411063@iiitsonepat.ac.in",
];

let clerkInstancePromise: Promise<Clerk | null> | null = null;

export const getClerkPublishableKey = () =>
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ||
  import.meta.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
  "";

export const getAllowedEmails = () => {
  const configured = import.meta.env.VITE_ALLOWED_LOGIN_EMAILS;
  const rawEmails = configured
    ? String(configured).split(",")
    : DEFAULT_ALLOWED_EMAILS;
  return new Set(
    rawEmails.map((email) => String(email).trim().toLowerCase()).filter(Boolean),
  );
};

export const getClerk = async () => {
  if (clerkInstancePromise) {
    return clerkInstancePromise;
  }

  clerkInstancePromise = (async () => {
    const publishableKey = getClerkPublishableKey();
    if (!publishableKey) {
      return null;
    }
    const clerk = new Clerk(publishableKey);
    await clerk.load();
    return clerk;
  })();

  return clerkInstancePromise;
};

export const getSessionToken = async () => {
  const clerk = await getClerk();
  if (!clerk?.session) {
    return null;
  }
  return (await clerk.session.getToken()) || null;
};

export const getCurrentUserEmail = async () => {
  const clerk = await getClerk();
  const user = clerk?.user;
  if (!user) {
    return null;
  }
  const primaryEmail = user.primaryEmailAddress?.emailAddress;
  const fallbackEmail = user.emailAddresses?.[0]?.emailAddress;
  return String(primaryEmail || fallbackEmail || "").toLowerCase() || null;
};
