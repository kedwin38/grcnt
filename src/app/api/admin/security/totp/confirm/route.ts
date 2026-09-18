import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, assertCsrf, readJson } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { decrypt } from "@/lib/crypto";
import { verifyTotp } from "@/lib/totp";
import { totpCodeSchema, zodMessage } from "@/lib/validation";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const user = await apiUser();
  if (!user || (user.role !== "STAFF" && user.role !== "ADMIN")) {
    return fail("Staff access required.", 403);
  }
  if (!user.totpSecret) return fail("Start setup first.", 422);

  const body = await readJson(req);
  const parsed = totpCodeSchema.safeParse(body);
  if (!parsed.success) return fail(zodMessage(parsed.error), 422);

  if (!verifyTotp(decrypt(user.totpSecret), parsed.data.code)) {
    return fail("That code didn't match. Check the time on your phone and try again.", 401);
  }

  await db.user.update({ where: { id: user.id }, data: { totpEnabled: true } });
  await audit({ id: user.id, name: user.name }, "auth.totp_enabled", "user", user.id);
  return ok({ enabled: true });
}
