import { NextRequest, NextResponse } from "next/server";

const CSRF_COOKIE = "gcn_csrf";
const SESSION_COOKIE = "gcn_sid";

function randomToken(): string {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Guard authenticated areas (role enforcement happens server-side in layouts).
  const needsUser =
    pathname.startsWith("/account") ||
    pathname.startsWith("/checkout") ||
    (pathname.startsWith("/orders") && pathname !== "/orders/track");
  // Everything under /admin requires a session cookie — there is no public
  // "/admin/login" to redirect to (that would announce the admin area to
  // anyone probing paths). The real sign-in page lives at a separate,
  // non-guessable path outside /admin entirely; visiting /admin without a
  // session just 404s like any other unknown route.
  const needsStaff = pathname.startsWith("/admin");

  if (needsUser && !req.cookies.get(SESSION_COOKIE)) {
    return NextResponse.redirect(
      new URL(`/login?next=${encodeURIComponent(pathname)}`, req.url)
    );
  }
  if (needsStaff && !req.cookies.get(SESSION_COOKIE)) {
    return NextResponse.rewrite(new URL(`/__404__${pathname}`, req.url));
  }

  const res = NextResponse.next();

  // Issue the CSRF double-submit token (readable by JS on purpose).
  if (!req.cookies.get(CSRF_COOKIE)) {
    res.cookies.set(CSRF_COOKIE, randomToken(), {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
