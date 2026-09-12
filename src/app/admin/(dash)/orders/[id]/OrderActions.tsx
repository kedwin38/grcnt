"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Loader2, Play, XCircle } from "lucide-react";
import { api } from "@/lib/client";

type Status =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";

const TOPUP_REF_LABEL: Record<string, string> = {
  INSTANT_TOPUP: "Safaricom top-up transaction ref (optional)",
  ROUTER_TOPUP: "Router load confirmation ref (optional)",
};
const TOPUP_REF_PLACEHOLDER: Record<string, string> = {
  INSTANT_TOPUP: "e.g. QGH7X52KPZ",
  ROUTER_TOPUP: "e.g. Loaded 30GB — confirmed",
};

export function OrderActions({
  orderId,
  status,
  fulfilment,
  topupRef,
}: {
  orderId: number;
  status: Status;
  fulfilment: string;
  topupRef: string;
  canModifyPrices: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ref, setRef] = useState(topupRef);
  const [confirmRefund, setConfirmRefund] = useState(false);

  async function act(
    action: "process" | "complete" | "cancel" | "refund",
    extra?: Record<string, unknown>
  ) {
    setError(null);
    setBusy(action);
    try {
      await api(`/api/admin/orders/${orderId}/status`, { body: { action, ...extra } });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="card p-6 space-y-4">
      <h2 className="font-extrabold text-ink">Actions</h2>

      {status === "PENDING_PAYMENT" ? (
        <p className="text-[13px] text-ink-mute leading-relaxed">
          Customer hasn&apos;t paid yet. If they claim they paid but no M-Pesa
          confirmation appears under &ldquo;Payment attempts&rdquo;, ask for their M-Pesa
          message and contact support before overriding anything.
        </p>
      ) : null}

      {status === "PAID" ? (
        <button className="btn btn-lg btn-primary w-full" disabled={busy !== null} onClick={() => act("process")}>
          {busy === "process" ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Play className="w-4.5 h-4.5" />}
          Start processing
        </button>
      ) : null}

      {status === "PAID" || status === "PROCESSING" ? (
        <div className="space-y-2.5 rounded-2xl border border-line p-4 bg-paper">
          <label className="label mb-0">
            {TOPUP_REF_LABEL[fulfilment] || "Dispatch / collection ref (optional)"}
          </label>
          <input
            className="input"
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            placeholder={TOPUP_REF_PLACEHOLDER[fulfilment] || "e.g. Dispatched with rider – Sam"}
          />
          <button
            className="btn btn-lg bg-brand-700 text-white hover:bg-brand-800 w-full"
            disabled={busy !== null}
            onClick={() => act("complete", { topupRef: ref || null })}
          >
            {busy === "complete" ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Check className="w-4.5 h-4.5" />}
            Mark completed
          </button>
        </div>
      ) : null}

      {status !== "CANCELLED" && status !== "REFUNDED" ? (
        <div className="pt-3 border-t border-line space-y-2.5">
          {confirmRefund ? (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 space-y-3">
              <p className="text-[13px] font-semibold text-amber-800 flex gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                {status === "PENDING_PAYMENT"
                  ? "Cancel this unpaid order? The customer can still re-order."
                  : status === "PAID" || status === "PROCESSING"
                    ? "Refund via M-Pesa reversal (*334# or M-Pesa for Business app) — no money has left the till automatically. Then mark refunded here."
                    : "Refund this completed order?"}
              </p>
              <div className="flex gap-2">
                {status === "PENDING_PAYMENT" ? (
                  <button className="btn btn-md btn-danger flex-1" disabled={busy !== null} onClick={() => act("cancel")}>
                    {busy === "cancel" ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                    Yes, cancel
                  </button>
                ) : (
                  <button className="btn btn-md btn-danger flex-1" disabled={busy !== null} onClick={() => act("refund")}>
                    {busy === "refund" ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Mark refunded
                  </button>
                )}
                <button className="btn btn-md btn-ghost" onClick={() => setConfirmRefund(false)}>
                  Back
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn-md btn-ghost w-full text-red-600 hover:bg-red-50" onClick={() => setConfirmRefund(true)}>
              {status === "PENDING_PAYMENT" ? "Cancel order…" : "Refund / cancel…"}
            </button>
          )}
        </div>
      ) : null}

      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}
