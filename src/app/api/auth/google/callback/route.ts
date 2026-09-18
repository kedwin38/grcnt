import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env, googleOAuthEnabled } from "@/lib/env";
import { resolveOrigin, clientIp } from "@/lib/api";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/ratelimit";
import { audit } from "@/lib/audit";
import { exchangeGoogleCode, GoogleOAuthError } from "@/lib/google-oauth";

const STATE_COOKIE = "gcn_oauth_state";

function failRedirect(req: NextRequest, error: string) {
  const res = NextResponse.redirect(new URL(`/login?error=${error}`, req.url));
  res.cookies.delete(STATE_COOKIE);
  return res;
}

export async function GET(req: NextRequest) {
  if (!googleOAuthEnabled) return failRedirect(req, "google_not_configured");

  const ip = clientIp(req);
  if (!rateLimit(`google-oauth:${ip}`, 20, 5 * 60_000).ok) {
    return failRedirect(req, "too_many_attempts");
  }

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get(STATE_COOKIE)?.value || "";
  const [expectedState, encodedNext] = cookieState.split(":");
  const next = encodedNext ? decodeURIComponent(encodedNext) : "/orders";
  const safeNext = next.startsWith("/") ? next : "/orders";

  if (!code || !state || !expectedState || state !== expectedState) {
    return failRedirect(req, "google_failed");
  }

  try {
    const redirectUri = `${resolveOrigin(req)}/api/auth/google/callback`;
    const payload = await exchangeGoogleCode({
      code,
      clientId: env.googleClientId,
      clientSecret: env.googleClientSecret,
      redirectUri,
    });

    if (!payload.email || !payload.email_verified) {
      return failRedirect(req, "google_no_email");
    }

    let user = await db.user.findUnique({ where: { googleId: payload.sub } });
    if (!user) {
      const byEmail = await db.user.findFirst({ where: { email: payload.email } });
      // Staff/admin accounts never sign in via Google — that would bypass
      // the password + TOTP protection the back-office login requires them
      // to go through. Only ever link/create CUSTOMER accounts here.
      if (byEmail && byEmail.role !== "CUSTOMER") {
        return failRedirect(req, "google_not_allowed");
      }
      if (byEmail) {
        user = await db.user.update({
          where: { id: byEmail.id },
          data: {
            googleId: payload.sub,
            avatarUrl: payload.picture || byEmail.avatarUrl,
          },
        });
      } else {
        user = await db.user.create({
          data: {
            name: payload.name?.trim() || payload.email.split("@")[0],
            email: payload.email,
            googleId: payload.sub,
            avatarUrl: payload.picture || null,
            passwordHash: null,
          },
        });
        await audit({ id: user.id, name: user.name }, "auth.register", "user", user.id, { via: "google" });
      }
    }

    if (!user.active) return failRedirect(req, "account_disabled");
    if (user.role !== "CUSTOMER") return failRedirect(req, "google_not_allowed");

    const session = await getSession();
    session.uid = user.id;
    session.role = user.role;
    session.name = user.name;
    await session.save();

    await audit({ id: user.id, name: user.name }, "auth.login", "user", user.id, { via: "google" });

    const res = NextResponse.redirect(new URL(safeNext, req.url));
    res.cookies.delete(STATE_COOKIE);
    return res;
  } catch (err) {
    if (!(err instanceof GoogleOAuthError)) console.error("google oauth callback failed:", err);
    return failRedirect(req, "google_failed");
  }
}
