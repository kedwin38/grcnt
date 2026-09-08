import { NextRequest, NextResponse } from "next/server";
import { env } from "./env";

// ─── JSON response helpers ───────────────────────────────────────────────────

export function ok<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ ok: true, data }, init);
}

export function fail(message: string, status = 400, code?: string) {
  return NextResponse.json({ ok: false, error: message, code }, { status });
}

// ─── Request context ─────────────────────────────────────────────────────────

export function clientIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}

/** Resolve the public origin: settings override → forwarded headers → APP_URL. */
export function resolveOrigin(req: NextRequest, callbackBaseUrl?: string): string {
  if (callbackBaseUrl) return callbackBaseUrl.replace(/\/+$/, "");
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (host) return `${proto}://${host}`;
  return env.appUrl.replace(/\/+$/, "");
}

// ─── CSRF (double-submit cookie) ─────────────────────────────────────────────

export const CSRF_COOKIE = "gcn_csrf";
export const CSRF_HEADER = "x-csrf-token";

/**
 * Validates the double-submit CSRF token on state-changing requests.
 * Daraja's callback is excluded (server-to-server, authenticated by payload).
 */
export function assertCsrf(req: NextRequest): NextResponse | null {
  if (req.method === "GET" || req.method === "HEAD") return null;
  const cookie = req.cookies.get(CSRF_COOKIE)?.value;
  const header = req.headers.get(CSRF_HEADER);
  if (!cookie || !header || cookie !== header) {
    return fail("Invalid or missing CSRF token. Refresh the page and try again.", 403, "CSRF");
  }
  // Origin check (defense in depth when Origin is present — e.g. browsers).
  const origin = req.headers.get("origin");
  if (origin) {
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
    try {
      if (host && new URL(origin).host !== host) {
        return fail("Cross-origin request blocked.", 403, "ORIGIN");
      }
    } catch {
      return fail("Invalid origin.", 403, "ORIGIN");
    }
  }
  return null;
}

/** Parse a JSON body safely. */
export async function readJson<T = unknown>(req: NextRequest): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
