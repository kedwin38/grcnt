import crypto from "node:crypto";
import { env } from "./env";

// AES-256-GCM encryption for secrets stored in the database (Daraja keys etc).
// Key derived from SESSION_SECRET — rotating SESSION_SECRET re-keys secrets.

const KEY = crypto.scryptSync(env.sessionSecret, "gcn-settings-salt-v1", 32);

export function encrypt(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("hex")}:${tag.toString("hex")}:${ct.toString("hex")}`;
}

export function decrypt(payload: string): string {
  try {
    const [v, ivHex, tagHex, ctHex] = payload.split(":");
    if (v !== "v1") return payload; // legacy plaintext row — read as-is
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      KEY,
      Buffer.from(ivHex, "hex")
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    return Buffer.concat([
      decipher.update(Buffer.from(ctHex, "hex")),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    return "";
  }
}
