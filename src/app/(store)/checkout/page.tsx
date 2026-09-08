import type { Metadata } from "next";
import { requireUser } from "@/lib/session";
import { prettyPhone } from "@/lib/format";
import { CheckoutForm } from "./CheckoutForm";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  const user = await requireUser("/checkout");
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-10">
      <h1 className="section-title">Checkout</h1>
      <p className="text-ink-soft mt-1">
        Signed in as {user.name} · {prettyPhone(user.phone)}
      </p>
      <CheckoutForm defaultName={user.name} defaultPhone={user.phone} />
    </div>
  );
}
