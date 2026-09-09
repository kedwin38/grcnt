import { describe, it, expect, beforeEach, vi } from "vitest";
import { saveSettingGroup } from "@/lib/settings";
import { stkPush, DARAJA_TERMINAL_FAILURE_CODES } from "@/lib/daraja";

describe("DARAJA_TERMINAL_FAILURE_CODES", () => {
  it("classifies only confirmed final outcomes as terminal", () => {
    for (const code of ["1", "1032", "1037", "2001"]) {
      expect(DARAJA_TERMINAL_FAILURE_CODES.has(code), `${code} should be terminal`).toBe(true);
    }
  });

  it("does not classify success or unknown/pending codes as terminal", () => {
    // "4999" is the exact code observed live: Daraja reported it while a
    // push had genuinely arrived and was awaiting PIN entry — treating it
    // as terminal would falsely fail a payment that's about to succeed.
    for (const code of ["0", "4999", "9999", "500.001.1001"]) {
      expect(DARAJA_TERMINAL_FAILURE_CODES.has(code), `${code} should NOT be terminal`).toBe(false);
    }
  });
});

describe("stkPush — Buy Goods vs Paybill shortcode handling", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = originalFetch;
  });

  function mockFetch(capture: { body?: string }) {
    global.fetch = vi.fn(async (url: unknown, opts?: RequestInit) => {
      const u = String(url);
      if (u.includes("oauth")) {
        return new Response(JSON.stringify({ access_token: "fake-token", expires_in: "3599" }), {
          status: 200,
        });
      }
      if (u.includes("stkpush")) {
        capture.body = String(opts?.body ?? "");
        return new Response(
          JSON.stringify({
            MerchantRequestID: "m1",
            CheckoutRequestID: "c1",
            ResponseCode: "0",
            ResponseDescription: "ok",
            CustomerMessage: "ok",
          }),
          { status: 200 }
        );
      }
      throw new Error(`Unexpected fetch to ${u}`);
    }) as unknown as typeof fetch;
  }

  it("sends BusinessShortCode and PartyB as two different values for Buy Goods", async () => {
    await saveSettingGroup("mpesa", {
      environment: "sandbox",
      consumerKey: "key",
      consumerSecret: "secret",
      passkey: "passkey",
      shortcode: "600123", // Store/HO number
      transactionType: "CustomerBuyGoodsOnline",
      tillNumber: "3547433", // actual till number
    });
    const capture: { body?: string } = {};
    mockFetch(capture);

    await stkPush({
      amount: 1,
      phone: "254700000000",
      accountReference: "TEST",
      description: "test",
      callbackUrl: "https://example.com/cb",
    });

    const body = JSON.parse(capture.body!);
    expect(body.BusinessShortCode).toBe("600123");
    expect(body.PartyB).toBe("3547433");
    expect(body.BusinessShortCode).not.toBe(body.PartyB);
  });

  it("sends BusinessShortCode and PartyB as the same value for Paybill", async () => {
    await saveSettingGroup("mpesa", {
      environment: "sandbox",
      consumerKey: "key",
      consumerSecret: "secret",
      passkey: "passkey",
      shortcode: "174379",
      transactionType: "CustomerPayBillOnline",
      tillNumber: "",
    });
    const capture: { body?: string } = {};
    mockFetch(capture);

    await stkPush({
      amount: 1,
      phone: "254700000000",
      accountReference: "TEST",
      description: "test",
      callbackUrl: "https://example.com/cb",
    });

    const body = JSON.parse(capture.body!);
    expect(body.BusinessShortCode).toBe("174379");
    expect(body.PartyB).toBe("174379");
  });

  it("fails fast with no network call when Buy Goods has no till number configured", async () => {
    await saveSettingGroup("mpesa", {
      environment: "sandbox",
      consumerKey: "key",
      consumerSecret: "secret",
      passkey: "passkey",
      shortcode: "600123",
      transactionType: "CustomerBuyGoodsOnline",
      tillNumber: "",
    });
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;

    await expect(
      stkPush({
        amount: 1,
        phone: "254700000000",
        accountReference: "TEST",
        description: "test",
        callbackUrl: "https://example.com/cb",
      })
    ).rejects.toMatchObject({ code: "TILL_NOT_CONFIGURED" });

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
