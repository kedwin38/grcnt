import type { Metadata } from "next";
import Link from "next/link";
import { getSettingGroup } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description: "The terms that govern purchases from Green Color Networks.",
};

export default async function TermsPage() {
  const business = await getSettingGroup("business");
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <div className="section-eyebrow">Legal</div>
      <h1 className="section-title mt-1">Terms &amp; Conditions</h1>
      <p className="text-ink-mute text-sm mt-2">Last updated: September 2026</p>

      <div className="prose-legal mt-8">
        <h2>1. About these terms</h2>
        <p>
          These Terms &amp; Conditions govern your use of the {business.name} website and
          any purchases you make through it. By placing an order you agree to these
          terms. {business.legalName} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) is an
          independent reseller of Safaricom products and is not owned by, operated by or
          affiliated with Safaricom PLC. Safaricom, M-Pesa and related marks belong to
          Safaricom PLC.
        </p>

        <h2>2. Your account</h2>
        <ul>
          <li>You register with your phone number and a password, and must provide accurate details.</li>
          <li>You are responsible for keeping your password confidential and for activity under your account.</li>
          <li>You must be at least 18 years old, or have a guardian&apos;s consent, to make purchases.</li>
        </ul>

        <h2>3. Orders and pricing</h2>
        <ul>
          <li>All prices are in Kenya Shillings (KES) and include applicable taxes unless stated otherwise.</li>
          <li>An order is a request to buy; the contract forms when we receive your M-Pesa payment.</li>
          <li>We may correct pricing errors and cancel affected orders with a full refund.</li>
          <li>Some offers (e.g. promotional bundle prices) are limited by stock or time and may change without notice.</li>
        </ul>

        <h2>4. Payment</h2>
        <p>
          Payments are processed through Safaricom&apos;s M-Pesa (Lipa na M-Pesa Online)
          to our till number {business.tillNumber}. When you check out, an M-Pesa prompt
          is sent to the phone number you provide; your M-Pesa PIN is entered on your
          handset and is never seen or stored by us. We store only the transaction
          reference issued by M-Pesa for reconciliation.
        </p>

        <h2>5. Delivery of products</h2>
        <ul>
          <li>
            <strong>Digital products</strong> (data bundles, airtime, minutes/SMS): delivered as a
            top-up to the Safaricom number you nominate, typically within minutes of
            payment confirmation. Delays can occur due to network conditions; contact
            support if a top-up hasn&apos;t arrived within 30 minutes.
          </li>
          <li>
            <strong>Devices and physical goods</strong>: delivered to the address you provide, or
            collected from our premises at {business.location} during {business.openHours}.
            Our team confirms delivery timing after payment. Risk passes to you on delivery.
          </li>
        </ul>

        <h2>6. Warranties and product authenticity</h2>
        <p>
          We sell genuine products. Devices sourced as new carry the manufacturer&apos;s
          warranty where applicable; that warranty is honoured per the
          manufacturer&apos;s terms. Top-up services depend on Safaricom network
          availability, which is outside our control.
        </p>

        <h2>7. Returns and refunds</h2>
        <p>
          Our returns and refunds position (including digital top-ups and devices) is set
          out in the <Link href="/refunds">Refunds &amp; Returns Policy</Link>, which
          forms part of these terms.
        </p>

        <h2>8. Liability</h2>
        <p>
          To the extent permitted by Kenyan law, our liability for any claim connected to
          an order is limited to the amount you paid for that order. We are not liable
          for indirect losses, or for failures of third-party networks (including
          M-Pesa and Safaricom outages).
        </p>

        <h2>9. Acceptable use</h2>
        <p>
          You may not misuse this website: no fraudulent orders, no attempts to breach
          security, no scraping at volumes that degrade the service, and no resale of
          access. We may suspend accounts that abuse the service.
        </p>

        <h2>10. Governing law</h2>
        <p>
          These terms are governed by the laws of the Republic of Kenya. Nothing here
          limits your rights under the Constitution of Kenya or the Consumer Protection
          Act, 2012.
        </p>

        <h2>11. Contact</h2>
        <p>
          Questions about these terms? Reach us at {business.email}, call{" "}
          {business.phone}, or send a message via our <Link href="/support">support page</Link>.
        </p>
      </div>
    </div>
  );
}
