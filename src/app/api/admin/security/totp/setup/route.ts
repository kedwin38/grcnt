import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, assertCsrf } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { encrypt } from "@/lib/crypto";
import { generateTotpSecret, otpauthUri } from "@/lib/totp";

// Generates a new secret and stores it (encrypted) but leaves totpEnabled
// false until /confirm proves the admin actually scanned/entered it — an
// abandoned setup never locks anyone out, since login only checks
// totpEnabled, not whether a secret exists.
export async function POST(req: NextRequest) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;
  const user = await apiUser();
  if (!user || (user.role !== "STAFF" && user.role !== "ADMIN")) {
    return fail("Staff access required.", 403);
  }

  const secret = generateTotpSecret();
  await db.user.update({ where: { id: user.id }, data: { totpSecret: encrypt(secret) } });

  return ok({
    secret,
    otpauthUri: otpauthUri(secret, user.phone || user.name, "Green Color Networks"),
  });
}
