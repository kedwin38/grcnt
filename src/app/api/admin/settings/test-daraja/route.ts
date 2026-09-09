import { NextRequest } from "next/server";
import { ok, fail, assertCsrf, readJson } from "@/lib/api";
import { apiUser } from "@/lib/session";
import { getDarajaToken, stkPush, stkQuery, isSimulated } from "@/lib/daraja";
import { getSettingGroup } from "@/lib/settings";
import { z } from "zod";
import { normalizePhone } from "@/lib/format";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const testSchema = z.object({
  phone: z.string().optional(),
  amount: z.number().int().min(1).max(200).optional(),
});

// Verifies Daraja credentials (OAuth) and optionally sends a real KSh 1 test
// STK push — the surest way to confirm till configuration end to end.
export async function POST(req: NextRequest) {
  const csrf = assertCsrf(req);
  if (csrf) return csrf;

  const user = await apiUser();
  if (!user || user.role !== "ADMIN") return fail("Admin access required.", 403);

  if (isSimulated()) {
    return ok({
      tokenOk: true,
      simulated: true,
      message:
        "Demo mode (MPESA_SIMULATE=true): real Daraja calls are skipped. Set MPESA_SIMULATE=false and configure credentials to test live.",
    });
  }

  const cfg = await getSettingGroup("mpesa");
  if (!cfg.consumerKey || !cfg.consumerSecret || !cfg.passkey) {
    return fail("Fill in consumer key, consumer secret and passkey first, then save.", 422);
  }

  try {
    await getDarajaToken(true);
  } catch (err) {
    return fail(err instanceof Error ? err.message : "Could not authenticate with Daraja.", 502);
  }

  const body = await readJson(req);
  const parsed = testSchema.safeParse(body || {});
  const phone = parsed.success && parsed.data.phone ? normalizePhone(parsed.data.phone) : null;

  if (parsed.success && phone) {
    let checkoutRequestId: string;
    try {
      const res = await stkPush({
        amount: 1,
        phone,
        accountReference: "TEST",
        description: "Credential test",
        callbackUrl: `${cfg.callbackBaseUrl || ""}/api/mpesa/callback`,
      });
      checkoutRequestId = res.CheckoutRequestID;
    } catch (err) {
      return fail(
        `Credentials OK, but the test STK push failed: ${err instanceof Error ? err.message : "unknown error"}`,
        502
      );
    }

    // Daraja accepting the request (ResponseCode 0) only means it was queued —
    // it does NOT mean the phone actually got a prompt. The only way to know
    // what really happened is to ask Daraja for the outcome a few seconds
    // later, exactly like we do for real customer payments.
    await sleep(10_000);
    try {
      const result = await stkQuery(checkoutRequestId);
      const rc = result.ResultCode ?? result.ResponseCode;
      if (rc === "0") {
        return ok({
          tokenOk: true,
          stkOk: true,
          message: `Confirmed: the push to ${phone} completed successfully (Ref: ${checkoutRequestId}). Your till, passkey and callback are all working.`,
        });
      }
      if (rc !== undefined && rc !== null && rc !== "") {
        return fail(
          `Daraja accepted the request but the push did not succeed: “${result.ResultDesc || "unknown result"}” (code ${rc}). If the customer never saw a prompt, this usually means the shortcode/passkey pair isn't quite right, or the till isn't activated for Lipa na M-Pesa Online — check M-Pesa For Business → your till → Manage My Till/APIs. (Ref: ${checkoutRequestId})`,
          502
        );
      }
    } catch {
      /* query not ready yet — fall through to the "still pending" message below */
    }

    return fail(
      `Daraja accepted the request (Ref: ${checkoutRequestId}) but hasn't confirmed a result after 10 seconds. If nothing arrived on ${phone}, your till almost certainly isn't activated for the Lipa na M-Pesa Online API yet — go to M-Pesa For Business → your till → Manage My Till/APIs and activate it, then try again.`,
      502
    );
  }

  return ok({
    tokenOk: true,
    message: "Daraja credentials are correct — OAuth token received. Use “Send KSh 1 test push” to fully verify the till.",
  });
}
