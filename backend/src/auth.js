const { auth } = require("./firebase");
const config = require("./config");

async function resolveUser(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token) return null;

  // Demo tokens (frontend falls back to these when Firebase is not configured)
  if (token.startsWith("demo-")) {
    if (!config.demoMode) return null;
    const uid = token.slice("demo-".length) || "demo-user";
    return {
      uid,
      displayName: "Guest Creator",
      email: "guest@vsn.local",
      photoURL: "",
      isDemo: true,
    };
  }

  if (!auth) return null;

  try {
    const decoded = await auth.verifyIdToken(token);
    const name =
      decoded.name ||
      (decoded.email ? decoded.email.split("@")[0] : "") ||
      "Creator";
    return {
      uid: decoded.uid,
      displayName: name,
      email: decoded.email,
      photoURL: decoded.picture || "",
      isDemo: false,
    };
  } catch (err) {
    return null;
  }
}

async function requireAuth(req, res, next) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return res.status(401).json({ error: "Authentication required. Sign in and try again." });
    }
    req.user = user;
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired session. Sign in again." });
  }
}

async function optionalAuth(req, res, next) {
  try {
    const user = await resolveUser(req);
    if (user) req.user = user;
  } catch (err) {
    /* treat as anonymous */
  }
  next();
}

function isAdminUser(user) {
  if (!user) return false;
  if (config.adminUids.includes(user.uid)) return true;
  if (config.demoMode && user.uid === "admin") return true;
  return false;
}

module.exports = { requireAuth, optionalAuth, resolveUser, isAdminUser };
