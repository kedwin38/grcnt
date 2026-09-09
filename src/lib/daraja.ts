// Safaricom Daraja (M-Pesa) service — OAuth token cache, STK Push (Lipa na
// M-Pesa Online), and STK Push Query. All credentials come from the
// admin-editable settings table; nothing is hardcoded.
import { getSettingGroup } from "./settings";
import { env } from "./env";

const TOKEN_CACHE = new Map<string, { token: string; expiresAt: number }>();

export class DarajaError extends Error {
  code: string;
  constructor(message: string, code = "DARAJA_ERROR") {
    super(message);
    this.code = code;
  }
}

// STK Push Query can return a ResultCode that is neither "0" (success) nor a
// confirmed terminal failure — Safaricom's own systems can report a
// transaction as still mid-flight (customer hasn't finished entering their
// PIN, or the query is simply asked before Daraja has concluded) using a
// non-zero code that is NOT documented as a final failure. Treating every
// non-zero code as failure risks marking a real, still-processing customer
// payment as failed while the customer is legitimately completing it.
// Only these codes are confirmed, final, "the transaction will not
// complete" outcomes — everything else is treated as still pending:
//   1    - insufficient funds
//   1032 - request cancelled by the customer
//   1037 - DS timeout, customer unreachable / did not respond in time
//   2001 - wrong PIN / invalid initiator information
export const DARAJA_TERMINAL_FAILURE_CODES = new Set(["1", "1032", "1037", "2001"]);

function baseUrl(environment: "sandbox" | "production") {
  return environment === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";
}

/** Daraja timestamps are expected as YYYYMMDDHHmmss in EAT (UTC+3). */
export function darajaTimestamp(date = new Date()): string {
  const eat = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  return eat.toISOString().replace(/[-:TZ.]/g, "").slice(0, 14);
}

function basicAuth(key: string, secret: string) {
  return `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`;
}

export async function getDarajaToken(force = false): Promise<string> {
  const cfg = await getSettingGroup("mpesa");
  if (!cfg.consumerKey || !cfg.consumerSecret) {
    throw new DarajaError(
      "Daraja credentials are not configured. Add them under Admin → Settings → M-Pesa.",
      "NOT_CONFIGURED"
    );
  }
  const cacheKey = `${cfg.environment}:${cfg.consumerKey}`;
  const cached = TOKEN_CACHE.get(cacheKey);
  if (!force && cached && cached.expiresAt > Date.now() + 30_000) {
    return cached.token;
  }
  const res = await fetch(
    `${baseUrl(cfg.environment)}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: basicAuth(cfg.consumerKey, cfg.consumerSecret) }, cache: "no-store" }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 400 || res.status === 401) {
      throw new DarajaError(
        "Daraja rejected the consumer key/secret. Check Admin → Settings → M-Pesa.",
        "BAD_CREDENTIALS"
      );
    }
    throw new DarajaError(`Daraja OAuth failed (${res.status}). ${text.slice(0, 200)}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: string };
  TOKEN_CACHE.set(cacheKey, {
    token: data.access_token,
    expiresAt: Date.now() + parseInt(data.expires_in || "3599", 10) * 1000,
  });
  return data.access_token;
}

export type StkPushResult = {
  MerchantRequestID: string;
  CheckoutRequestID: string;
  ResponseCode: string;
  ResponseDescription: string;
  CustomerMessage: string;
};

export async function stkPush(opts: {
  amount: number;
  phone: string; // 2547XXXXXXXX
  accountReference: string; // order code
  description: string;
  callbackUrl: string;
}): Promise<StkPushResult> {
  const cfg = await getSettingGroup("mpesa");

  // Buy Goods (Till) STK Push requires BusinessShortCode (the Store/HO number
  // used at Go Live) and PartyB (the till number) to be two different values
  // — per Safaricom's own Daraja FAQ. Sending the till number for both is the
  // single most common cause of error 2002 ("Agent number and Store number
  // entered do not match"). Paybill has no such split.
  if (cfg.transactionType === "CustomerBuyGoodsOnline" && !cfg.tillNumber) {
    throw new DarajaError(
      "Till number is not configured. Add it under Admin → Settings → M-Pesa — Buy Goods requires the Business Shortcode (Store/HO number) and the Till Number as two separate values.",
      "TILL_NOT_CONFIGURED"
    );
  }
  const partyB =
    cfg.transactionType === "CustomerBuyGoodsOnline" ? cfg.tillNumber : cfg.shortcode;

  const token = await getDarajaToken();
  const timestamp = darajaTimestamp();
  const password = Buffer.from(
    `${cfg.shortcode}${cfg.passkey}${timestamp}`
  ).toString("base64");

  const body = {
    BusinessShortCode: cfg.shortcode,
    Password: password,
    Timestamp: timestamp,
    TransactionType: cfg.transactionType,
    Amount: opts.amount,
    PartyA: opts.phone,
    PartyB: partyB,
    PhoneNumber: opts.phone,
    CallBackURL: opts.callbackUrl,
    AccountReference: opts.accountReference.slice(0, 12),
    TransactionDesc: opts.description.slice(0, 20),
  };

  const res = await fetch(`${baseUrl(cfg.environment)}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, string> & StkPushResult;

  if (!res.ok || data.ResponseCode === undefined || data.ResponseCode !== "0") {
    // Strip the ugly wrapper Daraja returns for consumer errors
    const msg =
      data.errorMessage ||
      data.ResponseDescription ||
      `STK push failed (HTTP ${res.status})`;
    throw new DarajaError(msg, data.ResponseCode || "STK_FAILED");
  }
  return data;
}

export type StkQueryResult = {
  ResponseCode: string;
  ResultCode: string;
  ResultDesc: string;
  CheckoutRequestID: string;
};

export async function stkQuery(checkoutRequestId: string): Promise<StkQueryResult> {
  const cfg = await getSettingGroup("mpesa");
  const token = await getDarajaToken();
  const timestamp = darajaTimestamp();
  const password = Buffer.from(
    `${cfg.shortcode}${cfg.passkey}${timestamp}`
  ).toString("base64");

  const res = await fetch(`${baseUrl(cfg.environment)}/mpesa/stkpushquery/v1/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: cfg.shortcode,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId,
    }),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, string> & StkQueryResult;
  if (!res.ok && !data.ResultCode) {
    throw new DarajaError(
      data.errorMessage || `STK query failed (HTTP ${res.status})`,
      "QUERY_FAILED"
    );
  }
  return data;
}

/** Whether local simulation mode is on (dev/demo only). */
export function isSimulated(): boolean {
  return env.mpesaSimulate;
}
