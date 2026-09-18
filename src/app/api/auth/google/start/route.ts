import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { env, googleOAuthEnabled } from "@/lib/env";
import { resolveOrigin } from "@/lib/api";
import { buildGoogleAuthUrl } from "@/lib/google-oauth";

const STATE_COOKIE = "gcn_oauth_state";

export async function GET(req: NextRequest) {
  const next = req.nextUrl.searchParams.get("next") || "/orders";
  const safeNext = next.startsWith("/") ? next : "/orders";

  if (!googleOAuthEnabled) {
    return NextResponse.redirect(new URL("/login?error=google_not_configured", req.url));
  }

  const state = crypto.randomBytes(18).toString("hex");
  const redirectUri = `${resolveOrigin(req)}/api/auth/google/callback`;
  const authUrl = buildGoogleAuthUrl({ clientId: env.googleClientId, redirectUri, state });

  const res = NextResponse.redirect(authUrl);
  res.cookies.set(STATE_COOKIE, `${state}:${encodeURIComponent(safeNext)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    maxAge: 10 * 60,
    path: "/",
  });
  return res;
}
