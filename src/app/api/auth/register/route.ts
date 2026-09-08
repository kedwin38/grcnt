import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ok, fail, assertCsrf, clientIp, readJson } from "@/lib/api";
import { registerSchema, zodMessage } from "@/lib/validation";
import { getSession } from "@/lib/session";
import { rateLimit } from "@/lib/ratelimit";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const ip = clientIp(req);
  if (!rateLimit(`register:${ip}`, 10, 60 * 60_000).ok) {
    return fail("Too many registrations from this device. Try again later.", 429);
  }

  const body = await readJson(req);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return fail(zodMessage(parsed.error), 422);

  const { name, phone, password } = parsed.data;
  const existing = await db.user.findUnique({ where: { phone } });
  if (existing) {
    return fail("An account with this phone number already exists. Try logging in.", 409);
  }

  const user = await db.user.create({
    data: { name, phone, passwordHash: await bcrypt.hash(password, 10) },
  });

  const session = await getSession();
  session.uid = user.id;
  session.role = user.role;
  session.name = user.name;
  await session.save();

  await audit({ id: user.id, name: user.name }, "auth.register", "user", user.id);
  return ok({ name: user.name, phone: user.phone });
}
