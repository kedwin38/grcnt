import { NextRequest } from "next/server";
import { ok, fail, assertCsrf, readJson } from "@/lib/api";
import { apiUser } from "@/lib/session";
import {
  getDarajaToken,
  stkPush,
  stkQuery,
  isSimulated,
  DARAJA_TERMINAL_FAILURE_CODES,
} from "@/lib/daraja";
import { getSettingGroup } from "@/lib/settings";
import { z } from "zod";
import { normalizePhone } from "@/lib/format";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Human-readable take on the confirmed terminal codes — these are real
// customer-side outcomes, not necessarily configuration problems, so the
// message shouldn't point the admin at their till setup for all of them.
function describeTerminalFailure(code: string, desc: string): string {
  switch (code) {
    case "1032":
      return `The prompt reached the phone but was cancelled (no PIN entered) — “${desc}”. That's actually a good sign: your till, passkey and callback are working. Try again and enter the PIN this time to fully confirm.`;
    case "1":
      return `The prompt reached the phone but the M-Pesa balance was too low to complete it — “${desc}”. This confirms your till, passkey and callback are working; top up and retry, or treat this as passed.`;
    case "1037":
      return `Daraja couldn't get a response from the phone in time — “${desc}”. If you didn't see a prompt at all, double-check the phone number and try again; a single timeout isn't necessarily a configuration problem.`;
    case "2001":
      return `Daraja rejected the request — “${desc}”. This can mean a wrong PIN was entered, or that the shortcode/passkey pair is mismatched. If you didn't get a prompt at all, check Settings → M-Pesa.`;
    default:
      return `Daraja reported a failure — “${desc}” (code ${code}).`;
  }
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
    // it does NOT mean the phone actually got a prompt, and a non-zero query
    // result doesn't necessarily mean failure either: Daraja can report a
    // transaction as still mid-flight (e.g. the admin hasn't finished
    // entering their PIN yet) using a code that isn't a documented final
    // failure. So we query twice, ~10s apart, and only report failure for
    // confirmed terminal codes — anything else is reported as still pending,
    // never as a false "failed".
    for (let attempt = 1; attempt <= 2; attempt++) {
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
        if (rc !== undefined && rc !== null && rc !== "" && DARAJA_TERMINAL_FAILURE_CODES.has(String(rc))) {
          return fail(
            `${describeTerminalFailure(String(rc), result.ResultDesc || "unknown result")} (Ref: ${checkoutRequestId})`,
            502
          );
        }
        // Non-terminal / unrecognised code (e.g. "still processing"): keep
        // waiting rather than reporting a false failure.
      } catch {
        /* query not ready yet — try again */
      }
    }

    return fail(
      `Daraja accepted the request (Ref: ${checkoutRequestId}) and hasn't returned a final result after 20 seconds — this usually just means it's still waiting on the PIN entry, not a failure. If you entered your PIN and nothing happened, or the prompt never arrived at all, that most likely means your till isn't activated for Lipa na M-Pesa Online — check M-Pesa For Business → your till → Manage My Till/APIs.`,
      502
    );
  }

  return ok({
    tokenOk: true,
    message: "Daraja credentials are correct — OAuth token received. Use “Send KSh 1 test push” to fully verify the till.",
  });
}
