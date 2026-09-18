import { describe, it, expect } from "vitest";
import { db } from "@/lib/db";
import { getPaymentAccount, setDefaultPaymentAccount, PaymentAccountError } from "@/lib/payment-accounts";
import { makeTestPaymentAccount } from "./helpers";

describe("getPaymentAccount", () => {
  it("resolves and decrypts a specific account by id", async () => {
    const account = await makeTestPaymentAccount();
    const resolved = await getPaymentAccount(account.id);
    expect(resolved.consumerKey).toBe("test-consumer-key");
    expect(resolved.consumerSecret).toBe("test-consumer-secret");
    expect(resolved.passkey).toBe("test-passkey");
    expect(resolved.tillNumber).toBe("3547433");
  });

  it("falls back to whichever account is flagged default when id is null", async () => {
    const account = await makeTestPaymentAccount();
    // setDefaultPaymentAccount unsets every other row first — using it here
    // (rather than creating with isDefault:true directly) keeps this
    // deterministic even though other test files share the same physical
    // SQLite file and may have left their own default rows behind.
    await setDefaultPaymentAccount(account.id);
    const resolved = await getPaymentAccount(null);
    expect(resolved.id).toBe(account.id);
  });

  it("throws NOT_CONFIGURED for an unknown id", async () => {
    await expect(getPaymentAccount(999_999)).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
  });

  it("throws NOT_CONFIGURED for an inactive account", async () => {
    const account = await makeTestPaymentAccount();
    await db.paymentAccount.update({ where: { id: account.id }, data: { active: false } });
    await expect(getPaymentAccount(account.id)).rejects.toMatchObject({ code: "NOT_CONFIGURED" });
  });

  it("throws TILL_NOT_CONFIGURED for Buy Goods with no till number", async () => {
    const account = await makeTestPaymentAccount({ tillNumber: null });
    await expect(getPaymentAccount(account.id)).rejects.toMatchObject({
      code: "TILL_NOT_CONFIGURED",
    });
  });

  it("is a PaymentAccountError instance, matching the DarajaError shape callers expect", async () => {
    try {
      await getPaymentAccount(999_999);
      throw new Error("expected getPaymentAccount to throw");
    } catch (err) {
      expect(err).toBeInstanceOf(PaymentAccountError);
      expect((err as PaymentAccountError).message).toMatch(/payment account/i);
    }
  });
});
