// TOTP (RFC 6238) for staff/admin two-factor login. Implemented directly on
// Node's built-in crypto — no external authenticator library needed. Works
// with any standard authenticator app (Google Authenticator, Authy, 1Password).
import crypto from "node:crypto";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(str: string): Buffer {
  const clean = str.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

/** Generate a new random base32 TOTP secret (20 bytes = 160 bits, standard strength). */
export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

function hotp(secret: Buffer, counter: number, digits = 6): string {
  const buf = Buffer.alloc(8);
  // Counter is a 64-bit big-endian integer; JS numbers are safe up to 2^53,
  // far beyond any realistic 30s-step counter value.
  buf.writeUInt32BE(Math.floor(counter / 2 ** 32), 0);
  buf.writeUInt32BE(counter % 2 ** 32, 4);
  const hmac = crypto.createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return String(code % 10 ** digits).padStart(digits, "0");
}

/** Current TOTP code for a base32 secret, at the given time (defaults to now). */
export function totpCode(secretBase32: string, forTime = Date.now(), step = 30, digits = 6): string {
  const counter = Math.floor(forTime / 1000 / step);
  return hotp(base32Decode(secretBase32), counter, digits);
}

/**
 * Verify a user-entered code, tolerating +/-1 time step of clock drift
 * between server and phone (matches the tolerance most authenticator UIs
 * assume). Returns true only for a well-formed, matching 6-digit code.
 */
export function verifyTotp(secretBase32: string, token: string, window = 1): boolean {
  const clean = token.trim();
  if (!/^\d{6}$/.test(clean)) return false;
  const secret = base32Decode(secretBase32);
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (let offset = -window; offset <= window; offset++) {
    const candidate = hotp(secret, counter + offset, 6);
    if (crypto.timingSafeEqual(Buffer.from(candidate), Buffer.from(clean))) {
      return true;
    }
  }
  return false;
}

/** otpauth:// URI for QR-less manual entry into any authenticator app. */
export function otpauthUri(secretBase32: string, accountLabel: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${accountLabel}`);
  const params = new URLSearchParams({
    secret: secretBase32,
    issuer,
    algorithm: "SHA1",
    digits: "6",
    period: "30",
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}
