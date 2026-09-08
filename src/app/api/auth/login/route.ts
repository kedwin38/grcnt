import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ok, fail, assertCsrf, clientIp, readJson } from "@/lib/api";
import { loginSchema, zodMessage } from "@/lib/validation";
import { getSession } from "@/lib/session";
import {
  rateLimit,
  registerLoginFail,
  isLockedOut,
  clearLoginFails,
} from "@/lib/ratelimit";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const ip = clientIp(req);
  if (!rateLimit(`login:${ip}`, 20, 5 * 60_000).ok) {
    return fail("Too many login attempts. Please wait a few minutes.", 429);
  }

  const body = await readJson(req);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return fail(zodMessage(parsed.error), 422);
  const { phone, password } = parsed.data;

  const lockKey = `${ip}:${phone}`;
  const lockedFor = isLockedOut(lockKey);
  if (lockedFor > 0) {
    return fail(
      `Account temporarily locked after failed attempts. Try again in ${Math.ceil(lockedFor / 60)} minute(s).`,
      429
    );
  }

  const user = await db.user.findUnique({ where: { phone } });
  const valid = user && user.active
    ? await bcrypt.compare(password, user.passwordHash)
    : false;

  if (!valid || !user) {
    registerLoginFail(lockKey);
    await audit(null, "auth.login_failed", "user", phone, { ip });
    return fail("Wrong phone number or password.", 401);
  }

  clearLoginFails(lockKey);
  const session = await getSession();
  session.uid = user.id;
  session.role = user.role;
  session.name = user.name;
  await session.save();

  await audit({ id: user.id, name: user.name }, "auth.login", "user", user.id);
  return ok({ name: user.name, phone: user.phone, role: user.role });
}
