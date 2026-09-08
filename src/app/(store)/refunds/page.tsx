import type { Metadata } from "next";
import Link from "next/link";
import { getSettingGroup } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Refunds & Returns",
  description: "Refunds and returns for bundles, airtime and devices bought from Green Color Networks.",
};

export default async function RefundsPage() {
  const business = await getSettingGroup("business");
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <div className="section-eyebrow">Legal</div>
      <h1 className="section-title mt-1">Refunds &amp; Returns Policy</h1>
      <p className="text-ink-mute text-sm mt-2">Last updated: September 2026</p>

      <div className="prose-legal mt-8">
        <h2>Our promise</h2>
        <p>
          If something goes wrong with your order, we will make it right — that&apos;s
          the standard we hold ourselves to. This policy explains exactly what to
          expect, in line with the Consumer Protection Act, 2012.
        </p>

        <h2>1. Digital products (data bundles, airtime, minutes/SMS)</h2>
        <ul>
          <li>
            <strong>Top-up not delivered?</strong> If a paid top-up hasn&apos;t landed on the
            nominated line within 30 minutes, contact support with your order code.
            We&apos;ll trace it with Safaricom and either complete delivery or refund you
            in full.
          </li>
          <li>
            <strong>Wrong number entered?</strong> A top-up delivered to the number you nominated
            at checkout cannot be reversed once Safaricom has applied it — please
            double-check the number before paying. If you spot the mistake before
            delivery, contact us immediately and we&apos;ll try to stop it.
          </li>
          <li>Once a bundle has been consumed, it is not refundable.</li>
        </ul>

        <h2>2. Devices (phones and accessories)</h2>
        <ul>
          <li>
            <strong>7-day return window</strong>: physical devices may be returned within 7 days
            of delivery/collection if they are faulty, not as described, or damaged in
            transit. The device must be in its original packaging with all accessories.
          </li>
          <li>
            <strong>Change of mind</strong>: unopened devices may be returned within 7 days for a
            refund, less any direct costs we&apos;ve incurred (e.g. delivery).
          </li>
          <li>
            <strong>Manufacturer warranty</strong>: faults arising after 7 days are handled under
            the manufacturer&apos;s warranty where one applies. We&apos;ll help you
            through the claim.
          </li>
          <li>
            Physical damage, liquid damage or unauthorised repairs are not covered.
          </li>
        </ul>

        <h2>3. How refunds are paid</h2>
        <p>
          Refunds are made via M-Pesa to the number that paid (buy-goods reversal), or
          where that&apos;s not possible, via bank transfer arranged with you. Approved
          refunds are processed within 3 working days; M-Pesa reversals usually reflect
          immediately once actioned.
        </p>

        <h2>4. Cancelled orders</h2>
        <p>
          You can cancel an order any time before payment at no cost. After payment,
          cancellation follows the refund rules above.
        </p>

        <h2>5. How to start</h2>
        <p>
          Send us a message from the <Link href="/support">support page</Link> with your
          order code (starts with GCN-) and what went wrong, call{" "}
          {business.phone}, or pass by {business.location} ({business.openHours}).
          Keep your M-Pesa confirmation message — it makes everything faster.
        </p>
      </div>
    </div>
  );
}
