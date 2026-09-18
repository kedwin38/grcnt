import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, assertCsrf, clientIp, readJson } from "@/lib/api";
import { getSession } from "@/lib/session";
import { decrypt } from "@/lib/crypto";
import { verifyTotp } from "@/lib/totp";
import { rateLimit, registerLoginFail, isLockedOut, clearLoginFails } from "@/lib/ratelimit";
import { audit } from "@/lib/audit";
import { z } from "zod";

const schema = z.object({ code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code") });

export async function POST(req: NextRequest) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const ip = clientIp(req);
  if (!rateLimit(`totp:${ip}`, 20, 5 * 60_000).ok) {
    return fail("Too many attempts. Please wait a few minutes.", 429);
  }

  const session = await getSession();
  const pendingUserId = session.pendingTotpUserId;
  const expiresAt = session.pendingTotpExpiresAt || 0;
  if (!pendingUserId || expiresAt < Date.now()) {
    session.pendingTotpUserId = undefined;
    session.pendingTotpExpiresAt = undefined;
    await session.save();
    return fail("Your sign-in attempt expired. Please log in again.", 401);
  }

  const lockKey = `totp:${ip}:${pendingUserId}`;
  const lockedFor = isLockedOut(lockKey);
  if (lockedFor > 0) {
    return fail(
      `Too many wrong codes. Try again in ${Math.ceil(lockedFor / 60)} minute(s).`,
      429
    );
  }

  const body = await readJson(req);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail("Enter the 6-digit code from your authenticator app.", 422);

  const user = await db.user.findUnique({ where: { id: pendingUserId } });
  const valid =
    user && user.active && user.totpEnabled && user.totpSecret
      ? verifyTotp(decrypt(user.totpSecret), parsed.data.code)
      : false;

  if (!valid || !user) {
    registerLoginFail(lockKey);
    await audit(null, "auth.totp_failed", "user", pendingUserId, { ip });
    return fail("Invalid code.", 401);
  }

  clearLoginFails(lockKey);
  session.pendingTotpUserId = undefined;
  session.pendingTotpExpiresAt = undefined;
  session.uid = user.id;
  session.role = user.role;
  session.name = user.name;
  await session.save();

  await audit({ id: user.id, name: user.name }, "auth.login", "user", user.id, { totp: true });
  return ok({ name: user.name, phone: user.phone, role: user.role });
}
