// Simple in-memory sliding-window rate limiter (per server instance —
// sufficient for a single-container deployment).
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// Periodic cleanup to avoid unbounded growth.
let lastSweep = Date.now();
function sweep() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

export function rateLimit(
  key: string,
  max: number,
  windowMs: number
): { ok: boolean; retryAfterSec: number } {
  sweep();
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  bucket.count += 1;
  if (bucket.count > max) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSec: 0 };
}

// Failed-login lockout tracker (separate from generic rate limiting).
const loginFails = new Map<string, { count: number; lockedUntil: number }>();

export function registerLoginFail(key: string, maxFails = 5, lockMs = 15 * 60_000) {
  const entry = loginFails.get(key) || { count: 0, lockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= maxFails) {
    entry.lockedUntil = Date.now() + lockMs;
    entry.count = 0;
  }
  loginFails.set(key, entry);
}

export function isLockedOut(key: string): number {
  const entry = loginFails.get(key);
  if (!entry) return 0;
  if (entry.lockedUntil > Date.now()) {
    return Math.ceil((entry.lockedUntil - Date.now()) / 1000);
  }
  return 0;
}

export function clearLoginFails(key: string) {
  loginFails.delete(key);
}
