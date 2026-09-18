// Centralised environment access. Only bootstrap secrets come from env —
// everything operational (Daraja keys, till, business info) lives in the
// admin-editable Settings table.
export const env = {
  sessionSecret:
    process.env.SESSION_SECRET && process.env.SESSION_SECRET.length >= 32
      ? process.env.SESSION_SECRET
      : "dev-insecure-secret-change-me-in-production-0123456789",
  appUrl: process.env.APP_URL || "http://localhost:3000",
  adminName: process.env.ADMIN_NAME || "Green Admin",
  adminPhone: process.env.ADMIN_PHONE || "254700000000",
  adminPassword: process.env.ADMIN_PASSWORD || "Admin#2026",
  // Local demo mode: simulate the M-Pesa STK flow without calling Daraja.
  mpesaSimulate: (process.env.MPESA_SIMULATE || "").toLowerCase() === "true",
  isProd: process.env.NODE_ENV === "production",
  // The admin sign-in page lives at this path instead of a guessable
  // "/admin/login" — anything under /admin is otherwise a plain 404 to
  // anyone without a session. Set ADMIN_LOGIN_PATH in production to a value
  // only staff know; the fallback here is a reasonable default, not a secret.
  adminLoginPath: (process.env.ADMIN_LOGIN_PATH || "staff-gateway-7k2x").replace(/^\/+|\/+$/g, ""),
  // "Continue with Google" is only offered when both are set — unconfigured
  // in dev/preview by default, so the button just doesn't render rather
  // than erroring.
  googleClientId: process.env.GOOGLE_CLIENT_ID || "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
};

export const googleOAuthEnabled = Boolean(env.googleClientId && env.googleClientSecret);

if (env.isProd && env.sessionSecret.startsWith("dev-insecure")) {
  console.error(
    "⚠️  SESSION_SECRET is not configured. Set a strong 32+ character secret before going live."
  );
}

if (env.isProd && env.adminLoginPath === "staff-gateway-7k2x") {
  console.error(
    "⚠️  ADMIN_LOGIN_PATH is not configured — the admin login is using the default path. Set a private value before going live."
  );
}
