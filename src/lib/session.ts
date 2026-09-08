import { getIronSession, IronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, User } from "@prisma/client";
import { db } from "./db";
import { env } from "./env";

export type SessionData = {
  uid?: number;
  role?: Role;
  name?: string;
};

export const SESSION_COOKIE = "gcn_sid";

const options: SessionOptions = {
  password: env.sessionSecret,
  cookieName: SESSION_COOKIE,
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const store = await cookies();
  return getIronSession<SessionData>(store, options);
}

export async function currentUser() {
  const session = await getSession();
  if (!session.uid) return null;
  const user = await db.user.findUnique({ where: { id: session.uid } });
  if (!user || !user.active) return null;
  return user;
}

export async function requireUser(next = "/account") {
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireStaff(): Promise<
  Omit<User, "role"> & { role: "STAFF" | "ADMIN" }
> {
  const user = await currentUser();
  if (!user || (user.role !== "STAFF" && user.role !== "ADMIN")) {
    redirect("/admin/login");
  }
  // redirect() throws, so from here user is guaranteed staff
  return user as Omit<User, "role"> & { role: "STAFF" | "ADMIN" };
}

export async function requireAdmin() {
  const user = await currentUser();
  if (!user || user.role !== "ADMIN") redirect("/admin/login");
  return user;
}

// For API routes — returns null instead of redirecting.
export async function apiUser() {
  return currentUser();
}
