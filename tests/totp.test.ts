import { describe, it, expect } from "vitest";
import { generateTotpSecret, totpCode, verifyTotp, otpauthUri, base32Encode } from "@/lib/totp";

describe("TOTP", () => {
  it("matches the official RFC 4226 HOTP test vectors (counter 0-9)", () => {
    // Verifies the underlying HMAC construction directly against the
    // published reference values — a subtle bug here would silently lock
    // every 2FA-enabled admin out (or worse, accept the wrong code).
    const secret = base32Encode(Buffer.from("12345678901234567890", "ascii"));
    const expected = [
      "755224", "287082", "359152", "969429", "338314",
      "254676", "287922", "162583", "399871", "520489",
    ];
    for (let i = 0; i < expected.length; i++) {
      const stepSeconds = i * 30;
      expect(totpCode(secret, stepSeconds * 1000, 30)).toBe(expected[i]);
    }
  });

  it("generates a usable secret and round-trips through verifyTotp", () => {
    const secret = generateTotpSecret();
    expect(secret.length).toBeGreaterThan(0);
    const code = totpCode(secret);
    expect(verifyTotp(secret, code)).toBe(true);
  });

  it("rejects a wrong code", () => {
    const secret = generateTotpSecret();
    const code = totpCode(secret);
    const wrong = code === "000000" ? "111111" : "000000";
    expect(verifyTotp(secret, wrong)).toBe(false);
  });

  it("rejects malformed input instead of throwing", () => {
    const secret = generateTotpSecret();
    expect(verifyTotp(secret, "abcdef")).toBe(false);
    expect(verifyTotp(secret, "12345")).toBe(false);
    expect(verifyTotp(secret, "")).toBe(false);
  });

  it("tolerates one time-step of clock drift either direction", () => {
    const secret = generateTotpSecret();
    const now = Date.now();
    const prevStepCode = totpCode(secret, now - 30_000);
    const nextStepCode = totpCode(secret, now + 30_000);
    expect(verifyTotp(secret, prevStepCode)).toBe(true);
    expect(verifyTotp(secret, nextStepCode)).toBe(true);
  });

  it("does not accept a code from two steps away", () => {
    const secret = generateTotpSecret();
    const farCode = totpCode(secret, Date.now() + 90_000);
    // Only a coincidental collision could make this fail — vanishingly
    // unlikely for a 6-digit code — so treat it as a real bug if it does.
    expect(verifyTotp(secret, farCode)).toBe(false);
  });

  it("produces a well-formed otpauth:// URI", () => {
    const secret = generateTotpSecret();
    const uri = otpauthUri(secret, "0700000000", "Green Color Networks");
    expect(uri.startsWith("otpauth://totp/")).toBe(true);
    expect(uri).toContain(`secret=${secret}`);
    expect(uri).toContain("issuer=Green");
  });

  it("uses a cryptographically random secret each time", () => {
    const a = generateTotpSecret();
    const b = generateTotpSecret();
    expect(a).not.toBe(b);
  });
});

// Sanity-check base32 against the official RFC 4648 §10 test vectors
// (unpadded, matching this implementation's output).
describe("base32Encode", () => {
  it("matches the RFC 4648 test vectors", () => {
    expect(base32Encode(Buffer.from("f", "ascii"))).toBe("MY");
    expect(base32Encode(Buffer.from("fo", "ascii"))).toBe("MZXQ");
    expect(base32Encode(Buffer.from("foo", "ascii"))).toBe("MZXW6");
    expect(base32Encode(Buffer.from("foob", "ascii"))).toBe("MZXW6YQ");
    expect(base32Encode(Buffer.from("fooba", "ascii"))).toBe("MZXW6YTB");
    expect(base32Encode(Buffer.from("foobar", "ascii"))).toBe("MZXW6YTBOI");
  });
});
