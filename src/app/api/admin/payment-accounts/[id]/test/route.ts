import { NextRequest } from "next/server";
import { ok, fail, assertCsrf, readJson } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { getDarajaToken, stkPush, isSimulated } from "@/lib/daraja";
import { getPaymentAccount, PaymentAccountError } from "@/lib/payment-accounts";
import { z } from "zod";
import { normalizePhone } from "@/lib/format";

const testSchema = z.object({
  phone: z.string().optional(),
  amount: z.number().int().min(1).max(200).optional(),
});

// Verifies one payment account's Daraja credentials (OAuth) and, optionally,
// sends a real KSh 1 test STK push. Only starts the push and returns
// immediately with its CheckoutRequestID — the admin UI polls
// /test/status?checkoutRequestId=... to watch it resolve, rather than this
// request blocking (and eventually giving up) while Daraja takes its time.
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const user = await apiUser();
  if (!user || user.role !== "ADMIN") return fail("Admin access required.", 403);

  const { id } = await params;
  const accountId = parseInt(id, 10);
  if (!Number.isInteger(accountId)) return fail("Invalid account.", 422);

  if (isSimulated()) {
    return ok({
      tokenOk: true,
      simulated: true,
      message:
        "Demo mode (MPESA_SIMULATE=true): real Daraja calls are skipped. Set MPESA_SIMULATE=false and configure credentials to test live.",
    });
  }

  let cfg;
  try {
    cfg = await getPaymentAccount(accountId);
  } catch (err) {
    if (err instanceof PaymentAccountError) return fail(err.message, 422);
    throw err;
  }

  try {
    await getDarajaToken(cfg, true);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not authenticate with Daraja.", 502);
  }

  const body = await readJson(req);
  const parsed = testSchema.safeParse(body || {});
  const phone = parsed.success && parsed.data.phone ? normalizePhone(parsed.data.phone) : null;

  if (parsed.success && phone) {
    try {
      const res = await stkPush(cfg, {
        amount: 1,
        phone,
        accountReference: "TEST",
        description: "Credential test",
        callbackUrl: `${cfg.callbackBaseUrl || ""}/api/mpesa/callback`,
      });
      return ok({
        tokenOk: true,
        checkoutRequestId: res.CheckoutRequestID,
        message: `Prompt sent to ${phone} (Ref: ${res.CheckoutRequestID}). Enter the PIN on that phone to confirm.`,
      });
    } catch (err) {
      return fail(
        `Credentials OK, but the test STK push failed: ${err instanceof Error ? err.message : "unknown error"}`,
        502
      );
    }
  }

  return ok({
    tokenOk: true,
    message: `Daraja credentials for "${cfg.label}" are correct — OAuth token received. Use "Send KSh 1 test push" to fully verify the till.`,
  });
}
