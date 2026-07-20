const { createClerkClient, verifyToken } = require("@clerk/backend");

const DEFAULT_ALLOWED_EMAILS = [
  "shubhsoch@gmail.com",
  "shubhamcse12411063@iiitsonepat.ac.in",
];

const getAllowedEmails = () => {
  const configured = process.env.ALLOWED_LOGIN_EMAILS;
  const rawEmails = configured
    ? configured.split(",")
    : DEFAULT_ALLOWED_EMAILS;
  return new Set(
    rawEmails
      .map((email) => String(email).trim().toLowerCase())
      .filter(Boolean),
  );
};

const getBearerToken = (req) => {
  const authHeader = req.headers?.authorization;
  if (!authHeader || typeof authHeader !== "string") {
    return null;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
};

const requireAuthorizedUser = async (req, res) => {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    res.status(500).json({ error: "CLERK_SECRET_KEY is not configured" });
    return null;
  }

  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Missing auth token" });
    return null;
  }

  try {
    const payload = await verifyToken(token, { secretKey });
    const userId = payload?.sub;
    if (!userId) {
      res.status(401).json({ error: "Invalid auth token" });
      return null;
    }

    const clerkClient = createClerkClient({ secretKey });
    const user = await clerkClient.users.getUser(userId);
    const userEmails =
      user.emailAddresses?.map((entry) =>
        String(entry.emailAddress).toLowerCase(),
      ) ?? [];

    const allowedEmails = getAllowedEmails();
    const isAllowed = userEmails.some((email) => allowedEmails.has(email));
    if (!isAllowed) {
      res.status(403).json({ error: "User is not allowed" });
      return null;
    }

    return { userId, userEmails };
  } catch (error) {
    console.error("Auth check failed:", error);
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
};

module.exports = {
  requireAuthorizedUser,
};
