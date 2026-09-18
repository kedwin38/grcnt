"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import { formatKES, prettyPhone } from "@/lib/format";
import { api } from "@/lib/client";

type Phase = "input" | "waiting" | "paused" | "success" | "failed";

// How long to keep auto-polling before pausing (the server keeps
// reconciling the payment in the background regardless — see
// src/lib/payment-reconciliation.ts — so pausing here only stops the
// browser's own polling, it never abandons the payment itself).
const AUTO_POLL_LIMIT_SECONDS = 600;
const POLL_INTERVAL_MS = 3000;

export function StkPay({
  order,
  defaultPhone,
}: {
  order: {
    code: string;
    total: number;
    items: { name: string; qty: number; lineTotal: number }[];
  };
  defaultPhone: string;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("input");
  const [phone, setPhone] = useState(prettyPhone(defaultPhone));
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  useEffect(() => stopPolling, [stopPolling]);

  const poll = useCallback(async () => {
    try {
      const status = await api<{
        status: "PENDING" | "SUCCESS" | "FAILED" | "CANCELLED";
        receipt?: string | null;
        resultDesc?: string | null;
      }>(`/api/payments/status/${order.code}`);
      if (status.status === "SUCCESS") {
        stopPolling();
        setReceipt(status.receipt || null);
        setPhase("success");
        router.refresh();
      } else if (status.status === "FAILED" || status.status === "CANCELLED") {
        stopPolling();
        setError(status.resultDesc || "The payment did not go through.");
        setPhase("failed");
      }
    } catch {
      /* transient network error — keep polling */
    }
  }, [order.code, router, stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    setElapsedSeconds(0);
    void poll();
    pollTimer.current = setInterval(() => {
      setElapsedSeconds((s) => {
        const next = s + POLL_INTERVAL_MS / 1000;
        if (next >= AUTO_POLL_LIMIT_SECONDS) {
          stopPolling();
          setPhase((p) => (p === "waiting" ? "paused" : p));
          return next;
        }
        void poll();
        return next;
      });
    }, POLL_INTERVAL_MS);
  }, [poll, stopPolling]);

  async function initiate() {
    setError(null);
    setPhase("waiting");
    try {
      await api("/api/payments/stk", { body: { code: order.code, phone } });
      startPolling();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the M-Pesa prompt.");
      setPhase("failed");
    }
  }

  function checkAgain() {
    setPhase("waiting");
    startPolling();
  }

  return (
    <div className="mx-auto max-w-lg px-4 sm:px-6 py-12">
      <div className="card overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-brand-600 to-brand-800 text-white p-6 text-center relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10" aria-hidden="true" />
          <div className="relative">
            <div className="text-brand-100 text-[12px] font-bold uppercase tracking-[0.16em]">
              Order {order.code}
            </div>
            <div className="text-4xl font-extrabold mt-2">{formatKES(order.total)}</div>
            <div className="text-white/70 text-[13px] mt-1">Pay with M-Pesa</div>
          </div>
        </div>

        <div className="p-6">
          <ul className="space-y-2 border-b border-line pb-4">
            {order.items.map((item) => (
              <li key={item.name} className="flex justify-between text-sm">
                <span className="text-ink-soft">
                  <span className="font-semibold text-ink">{item.name}</span> × {item.qty}
                </span>
                <span className="font-bold">{formatKES(item.lineTotal)}</span>
              </li>
            ))}
          </ul>

          {phase === "input" || phase === "failed" ? (
            <div className="mt-5 animate-fade-in">
              <label htmlFor="mpesa-phone" className="label">
                M-Pesa phone number
              </label>
              <div className="flex gap-2">
                <input
                  id="mpesa-phone"
                  className="input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 0712 345 678"
                  inputMode="tel"
                  autoComplete="tel"
                />
                <button className="btn btn-lg btn-primary shrink-0" onClick={initiate}>
                  Pay now
                </button>
              </div>
              {phase === "failed" && error ? (
                <div className="mt-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[13px] font-medium px-3.5 py-3 flex gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
                </div>
              ) : null}
              <p className="field-hint mt-3">
                You&apos;ll receive a prompt on this phone — enter your M-Pesa PIN to complete
                payment. Your PIN is never shared with us.
              </p>
            </div>
          ) : null}

          {phase === "waiting" ? (
            <div className="mt-6 text-center animate-fade-in">
              <div className="mx-auto w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center animate-pulse-ring">
                <Smartphone className="w-9 h-9 text-brand-700" />
              </div>
              <h2 className="mt-5 font-extrabold text-lg text-ink">
                Check your phone 📲
              </h2>
              <p className="text-ink-soft text-sm mt-1.5 max-w-xs mx-auto leading-relaxed">
                We&apos;ve sent an M-Pesa request to{" "}
                <span className="font-bold text-ink">{phone}</span>. Enter your PIN to authorise{" "}
                {formatKES(order.total)}.
              </p>
              <div className="mt-4 flex items-center justify-center gap-2 text-[13px] text-ink-mute">
                <Loader2 className="w-4 h-4 animate-spin text-brand-600" />
                {elapsedSeconds < 60
                  ? "Waiting for confirmation…"
                  : "Still waiting — this can take a couple of minutes…"}
              </div>
              {elapsedSeconds >= 60 ? (
                <p className="text-[12px] text-ink-mute mt-2 max-w-xs mx-auto leading-relaxed">
                  No need to keep this tab open — we&apos;ll finish confirming even if you leave.
                  Check{" "}
                  <Link href={`/orders/${order.code}`} className="underline font-semibold">
                    your order status
                  </Link>{" "}
                  any time.
                </p>
              ) : null}
              <button
                className="btn btn-md btn-ghost mt-5"
                onClick={() => {
                  stopPolling();
                  setPhase("input");
                }}
              >
                Cancel and retry
              </button>
            </div>
          ) : null}

          {phase === "paused" ? (
            <div className="mt-6 text-center animate-fade-in">
              <div className="mx-auto w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="w-9 h-9 text-amber-700" />
              </div>
              <h2 className="mt-5 font-extrabold text-lg text-ink">Still no confirmation</h2>
              <p className="text-ink-soft text-sm mt-1.5 max-w-xs mx-auto leading-relaxed">
                Daraja hasn&apos;t given a final answer yet. This isn&apos;t a failure — we&apos;re
                still confirming in the background, and your order stays open. If you entered
                your PIN, no need to pay again.
              </p>
              <div className="mt-5 flex flex-col items-center gap-2">
                <button className="btn btn-md btn-primary" onClick={checkAgain}>
                  <RefreshCw className="w-4 h-4" /> Check again
                </button>
                <Link href={`/orders/${order.code}`} className="text-[13px] font-semibold text-brand-700 hover:underline">
                  View order status
                </Link>
              </div>
            </div>
          ) : null}

          {phase === "success" ? (
            <div className="mt-6 text-center animate-fade-up">
              <div className="mx-auto w-20 h-20 rounded-full bg-brand-100 flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-brand-600" />
              </div>
              <h2 className="mt-5 font-extrabold text-xl text-ink">Payment received!</h2>
              <p className="text-ink-soft text-sm mt-1.5 max-w-xs mx-auto">
                {receipt ? (
                  <>
                    M-Pesa receipt <span className="font-bold text-ink">{receipt}</span>.{" "}
                  </>
                ) : null}
                We&apos;re getting your order ready right away.
              </p>
              <button
                className="btn btn-lg btn-primary mt-6"
                onClick={() => router.push(`/orders/${order.code}?paid=1`)}
              >
                View my order <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <p className="text-center text-[12px] text-ink-mute mt-5 flex items-center justify-center gap-1.5">
        <RefreshCw className="w-3 h-3" />
        Didn&apos;t get the prompt? Tap “Cancel and retry” — no double charges, we reconcile every
        payment.
      </p>
    </div>
  );
}
