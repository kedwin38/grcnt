import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ok, fail, assertCsrf, readJson } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { totpDisableSchema, zodMessage } from "@/lib/validation";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const user = await apiUser();
  if (!user || (user.role !== "STAFF" && user.role !== "ADMIN")) {
    return fail("Staff access required.", 403);
  }

  const body = await readJson(req);
  const parsed = totpDisableSchema.safeParse(body);
  if (!parsed.success) return fail(zodMessage(parsed.error), 422);

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return fail("Wrong password.", 401);

  await db.user.update({ where: { id: user.id }, data: { totpEnabled: false, totpSecret: null } });
  await audit({ id: user.id, name: user.name }, "auth.totp_disabled", "user", user.id);
  return ok({ enabled: false });
}
