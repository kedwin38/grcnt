// Multi-till Daraja credentials. Each PaymentAccount is one till/paybill's
// full set of Daraja credentials; products (and therefore orders) resolve to
// exactly one account, since a single STK push can only pay into one till.
import { db } from "./db";
import { encrypt, decrypt } from "./crypto";
import { maskSecret } from "./settings";

export type DarajaEnvironment = "sandbox" | "production";
export type DarajaTransactionType = "CustomerBuyGoodsOnline" | "CustomerPayBillOnline";

/** Fully decrypted credentials, ready to hand to src/lib/daraja.ts. */
export type ResolvedPaymentAccount = {
  id: number;
  label: string;
  environment: DarajaEnvironment;
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  shortcode: string;
  transactionType: DarajaTransactionType;
  tillNumber: string;
  callbackBaseUrl: string;
};

/** Admin-facing row — secrets masked, never sent to the browser in full. */
export type PaymentAccountSummary = {
  id: number;
  label: string;
  environment: DarajaEnvironment;
  consumerKey: string;
  consumerSecret: string; // masked
  passkey: string; // masked
  shortcode: string;
  transactionType: DarajaTransactionType;
  tillNumber: string;
  callbackBaseUrl: string;
  isDefault: boolean;
  active: boolean;
  productCount: number;
};

export class PaymentAccountError extends Error {
  code: string;
  constructor(message: string, code = "PAYMENT_ACCOUNT_ERROR") {
    super(message);
    this.code = code;
  }
}

function toResolved(row: {
  id: number;
  label: string;
  environment: string;
  consumerKey: string;
  consumerSecret: string;
  passkey: string;
  shortcode: string;
  transactionType: string;
  tillNumber: string | null;
  callbackBaseUrl: string | null;
}): ResolvedPaymentAccount {
  return {
    id: row.id,
    label: row.label,
    environment: row.environment as DarajaEnvironment,
    consumerKey: decrypt(row.consumerKey),
    consumerSecret: decrypt(row.consumerSecret),
    passkey: decrypt(row.passkey),
    shortcode: row.shortcode,
    transactionType: row.transactionType as DarajaTransactionType,
    tillNumber: row.tillNumber || "",
    callbackBaseUrl: row.callbackBaseUrl || "",
  };
}

/**
 * Resolve the account an order/STK-push should use: the explicit id if given,
 * else whichever account is flagged default. Throws the same shape of error
 * daraja.ts already surfaces for "not configured" so existing customer-safe
 * error handling keeps working unchanged.
 */
export async function getPaymentAccount(id: number | null): Promise<ResolvedPaymentAccount> {
  const row = id
    ? await db.paymentAccount.findUnique({ where: { id } })
    : await db.paymentAccount.findFirst({ where: { isDefault: true } });
  if (!row || !row.active) {
    throw new PaymentAccountError(
      "Daraja credentials are not configured. Add a payment account under Admin → Payment Accounts.",
      "NOT_CONFIGURED"
    );
  }
  // Check the decrypted values, not the raw columns — AES-GCM ciphertext is
  // never an empty string even when the original plaintext was, so checking
  // row.consumerKey etc. directly would never catch a blank field.
  const resolved = toResolved(row);
  if (!resolved.consumerKey || !resolved.consumerSecret || !resolved.passkey || !resolved.shortcode) {
    throw new PaymentAccountError(
      `Payment account "${row.label}" is missing required Daraja fields. Check Admin → Payment Accounts.`,
      "NOT_CONFIGURED"
    );
  }
  if (resolved.transactionType === "CustomerBuyGoodsOnline" && !resolved.tillNumber) {
    throw new PaymentAccountError(
      `Payment account "${row.label}" is Buy Goods but has no till number set — Business Shortcode and Till Number must be two separate values.`,
      "TILL_NOT_CONFIGURED"
    );
  }
  return resolved;
}

export async function listPaymentAccounts(): Promise<PaymentAccountSummary[]> {
  const rows = await db.paymentAccount.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    include: { _count: { select: { products: true } } },
  });
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    environment: row.environment as DarajaEnvironment,
    consumerKey: row.consumerKey ? maskSecret(decrypt(row.consumerKey)) : "",
    consumerSecret: row.consumerSecret ? maskSecret(decrypt(row.consumerSecret)) : "",
    passkey: row.passkey ? maskSecret(decrypt(row.passkey)) : "",
    shortcode: row.shortcode,
    transactionType: row.transactionType as DarajaTransactionType,
    tillNumber: row.tillNumber || "",
    callbackBaseUrl: row.callbackBaseUrl || "",
    isDefault: row.isDefault,
    active: row.active,
    productCount: row._count.products,
  }));
}

export type PaymentAccountInput = {
  label: string;
  environment: DarajaEnvironment;
  consumerKey?: string; // empty = keep existing (update only)
  consumerSecret?: string;
  passkey?: string;
  shortcode: string;
  transactionType: DarajaTransactionType;
  tillNumber?: string;
  callbackBaseUrl?: string;
  active?: boolean;
};

export async function createPaymentAccount(input: PaymentAccountInput) {
  const isFirst = (await db.paymentAccount.count()) === 0;
  return db.paymentAccount.create({
    data: {
      label: input.label,
      environment: input.environment,
      consumerKey: encrypt(input.consumerKey || ""),
      consumerSecret: encrypt(input.consumerSecret || ""),
      passkey: encrypt(input.passkey || ""),
      shortcode: input.shortcode,
      transactionType: input.transactionType,
      tillNumber: input.tillNumber || null,
      callbackBaseUrl: input.callbackBaseUrl || null,
      active: input.active ?? true,
      isDefault: isFirst, // the very first account created is automatically the default
    },
  });
}

export async function updatePaymentAccount(id: number, input: Partial<PaymentAccountInput>) {
  const data: Record<string, unknown> = {};
  if (input.label !== undefined) data.label = input.label;
  if (input.environment !== undefined) data.environment = input.environment;
  if (input.consumerKey) data.consumerKey = encrypt(input.consumerKey);
  if (input.consumerSecret) data.consumerSecret = encrypt(input.consumerSecret);
  if (input.passkey) data.passkey = encrypt(input.passkey);
  if (input.shortcode !== undefined) data.shortcode = input.shortcode;
  if (input.transactionType !== undefined) data.transactionType = input.transactionType;
  if (input.tillNumber !== undefined) data.tillNumber = input.tillNumber || null;
  if (input.callbackBaseUrl !== undefined) data.callbackBaseUrl = input.callbackBaseUrl || null;
  if (input.active !== undefined) data.active = input.active;
  return db.paymentAccount.update({ where: { id }, data });
}

export async function setDefaultPaymentAccount(id: number) {
  await db.$transaction([
    db.paymentAccount.updateMany({ where: { isDefault: true }, data: { isDefault: false } }),
    db.paymentAccount.update({ where: { id }, data: { isDefault: true, active: true } }),
  ]);
}

/**
 * Delete when unused; otherwise just deactivate (mirrors how categories with
 * products are hidden rather than deleted) so historical orders/products
 * keep a valid reference and nothing silently breaks.
 */
export async function deletePaymentAccount(id: number): Promise<{ deleted: boolean; hidden?: boolean; reason?: string }> {
  const account = await db.paymentAccount.findUnique({ where: { id } });
  if (!account) return { deleted: false, reason: "Not found." };
  if (account.isDefault) {
    return { deleted: false, reason: "Set another account as default before deleting this one." };
  }
  const productCount = await db.product.count({ where: { paymentAccountId: id } });
  if (productCount > 0) {
    await db.paymentAccount.update({ where: { id }, data: { active: false } });
    return { deleted: false, hidden: true, reason: `${productCount} product(s) use this account — deactivated instead.` };
  }
  await db.paymentAccount.delete({ where: { id } });
  return { deleted: true };
}
