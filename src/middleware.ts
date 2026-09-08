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
  const needsStaff =
    pathname.startsWith("/admin") && !pathname.startsWith("/admin/login");

  if ((needsUser || needsStaff) && !req.cookies.get(SESSION_COOKIE)) {
    const login = needsStaff ? "/admin/login" : `/login?next=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(new URL(login, req.url));
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
