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
};

if (env.isProd && env.sessionSecret.startsWith("dev-insecure")) {
  console.error(
    "⚠️  SESSION_SECRET is not configured. Set a strong 32+ character secret before going live."
  );
}
