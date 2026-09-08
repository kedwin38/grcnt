import { CheckCircle2, Circle, XCircle } from "lucide-react";
import { formatDateTime, formatKES, prettyPhone } from "@/lib/format";

export type OrderStatusStr =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "COMPLETED"
  | "CANCELLED"
  | "REFUNDED";

export function OrderStatusBadge({ status }: { status: OrderStatusStr }) {
  switch (status) {
    case "PENDING_PAYMENT":
      return <span className="badge badge-amber">Awaiting payment</span>;
    case "PAID":
      return <span className="badge badge-blue">Paid — preparing</span>;
    case "PROCESSING":
      return <span className="badge badge-blue">In progress</span>;
    case "COMPLETED":
      return <span className="badge badge-green">Completed</span>;
    case "CANCELLED":
      return <span className="badge badge-gray">Cancelled</span>;
    case "REFUNDED":
      return <span className="badge badge-red">Refunded</span>;
  }
}

const STEPS: { key: OrderStatusStr; label: string; hint: string }[] = [
  { key: "PENDING_PAYMENT", label: "Order placed", hint: "Confirm payment with M-Pesa" },
  { key: "PAID", label: "Payment received", hint: "We've verified your M-Pesa payment" },
  { key: "PROCESSING", label: "Being processed", hint: "Top-up or packing in progress" },
  { key: "COMPLETED", label: "Completed", hint: "All done — enjoy!" },
];

export function OrderTimeline({
  status,
  topupRef,
}: {
  status: OrderStatusStr;
  topupRef?: string | null;
}) {
  if (status === "CANCELLED" || status === "REFUNDED") {
    return (
      <div className="flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700 text-sm font-semibold">
        <XCircle className="w-5 h-5" />
        This order was {status.toLowerCase()}. {topupRef ? `Ref: ${topupRef}` : ""}
      </div>
    );
  }

  const activeIndex = STEPS.findIndex((s) => s.key === status);

  return (
    <ol className="relative">
      {STEPS.map((step, i) => {
        const done = i < activeIndex;
        const current = i === activeIndex;
        return (
          <li key={step.key} className="flex gap-3.5 relative">
            {i < STEPS.length - 1 ? (
              <span
                className={`absolute left-[11px] top-7 bottom-0 w-0.5 ${
                  done ? "bg-brand-500" : "bg-line"
                }`}
                aria-hidden="true"
              />
            ) : null}
            <span className="z-10 mt-0.5 shrink-0">
              {done ? (
                <CheckCircle2 className="w-6 h-6 text-brand-500" />
              ) : current ? (
                <Circle className="w-6 h-6 text-brand-500 fill-brand-100" />
              ) : (
                <Circle className="w-6 h-6 text-line fill-surface" />
              )}
            </span>
            <div className={i < STEPS.length - 1 ? "pb-5" : ""}>
              <div
                className={`text-sm font-bold ${
                  done || current ? "text-ink" : "text-ink-mute"
                }`}
              >
                {step.label}
                {current ? (
                  <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-bold text-brand-700 uppercase tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                    Current
                  </span>
                ) : null}
              </div>
              <div className={`text-[13px] ${done || current ? "text-ink-soft" : "text-ink-mute/70"}`}>
                {step.hint}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function PaymentInfo({
  payment,
}: {
  payment: {
    mpesaReceipt: string | null;
    phone: string;
    amount: number;
    createdAt: Date | string;
    simulated?: boolean;
  } | null;
}) {
  if (!payment) return null;
  return (
    <div className="rounded-xl border border-line bg-brand-50/50 px-4 py-3.5">
      <div className="text-[11px] font-bold uppercase tracking-wider text-ink-mute">
        M-Pesa payment {payment.simulated ? "(demo)" : ""}
      </div>
      <div className="mt-1.5 grid grid-cols-2 gap-y-1.5 text-sm">
        <span className="text-ink-soft">Receipt</span>
        <span className="font-bold text-ink text-right">
          {payment.mpesaReceipt || "—"}
        </span>
        <span className="text-ink-soft">Paid from</span>
        <span className="font-bold text-ink text-right">{prettyPhone(payment.phone)}</span>
        <span className="text-ink-soft">Amount</span>
        <span className="font-bold text-ink text-right">{formatKES(payment.amount)}</span>
        <span className="text-ink-soft">When</span>
        <span className="font-bold text-ink text-right">{formatDateTime(payment.createdAt)}</span>
      </div>
    </div>
  );
}
