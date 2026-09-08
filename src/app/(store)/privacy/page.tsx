import type { Metadata } from "next";
import Link from "next/link";
import { getSettingGroup } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Green Color Networks collects, uses and protects your data.",
};

export default async function PrivacyPage() {
  const business = await getSettingGroup("business");
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <div className="section-eyebrow">Legal</div>
      <h1 className="section-title mt-1">Privacy Policy</h1>
      <p className="text-ink-mute text-sm mt-2">Last updated: September 2026</p>

      <div className="prose-legal mt-8">
        <h2>1. Who we are</h2>
        <p>
          {business.legalName} operates this website. We are the data controller for
          personal data collected here. You can reach us at {business.email} or{" "}
          {business.phone}.
        </p>

        <h2>2. What we collect</h2>
        <ul>
          <li><strong>Account data</strong>: your name and phone number, and your password (stored only as an irreversible hash).</li>
          <li><strong>Order data</strong>: items purchased, amounts, the number to top up, delivery addresses and order notes.</li>
          <li><strong>Payment data</strong>: M-Pesa transaction references and the paying phone number. We never see or store your M-Pesa PIN or full M-Pesa account details.</li>
          <li><strong>Support messages</strong>: the content you send us and our replies.</li>
          <li><strong>Technical data</strong>: standard server logs (IP address, timestamps) used for security and rate limiting.</li>
        </ul>

        <h2>3. Why we collect it</h2>
        <ul>
          <li>To create your account and let you track orders (account data).</li>
          <li>To process, fulfil and reconcile your orders and payments (order &amp; payment data).</li>
          <li>To answer your questions and resolve disputes (support messages).</li>
          <li>To prevent fraud and secure the service (technical data).</li>
        </ul>
        <p>
          We do not sell your data. We do not use your data for advertising. We share it
          only where necessary: with Safaricom (to deliver the M-Pesa prompt and the
          products you buy) and where the law requires.
        </p>

        <h2>4. Legal basis &amp; your rights under the Data Protection Act, 2019</h2>
        <p>
          We process your data on the basis of contract performance (your orders) and
          legitimate interest (security, dispute resolution). Under Kenya&apos;s Data
          Protection Act, 2019 you have the right to: be informed; access your data;
          correct inaccurate data; object to processing; and request deletion in
          appropriate circumstances. To exercise any right, contact {business.email}.
          You may also lodge a complaint with the Office of the Data Protection
          Commissioner (ODPC).
        </p>

        <h2>5. How long we keep data</h2>
        <p>
          Order and payment records are retained for at least 7 years for tax and audit
          purposes. Account data is kept while your account is active. Support
          conversations are kept for 2 years after resolution.
        </p>

        <h2>6. Security</h2>
        <ul>
          <li>Passwords are hashed — never stored in readable form.</li>
          <li>Payment credentials (Daraja keys) are encrypted at rest.</li>
          <li>Sessions use signed, HTTP-only cookies over HTTPS.</li>
          <li>Administrative actions are audit-logged.</li>
        </ul>

        <h2>7. Cookies</h2>
        <p>
          We use only the cookies required to run the site: a login session cookie and a
          security (CSRF) token. No third-party tracking or advertising cookies are used.
        </p>

        <h2>8. Children</h2>
        <p>
          This service is not directed at children under 13, and we do not knowingly
          collect their data.
        </p>

        <h2>9. Changes</h2>
        <p>
          If we change this policy we will update this page and the date above. Material
          changes will be announced on the site.
        </p>

        <h2>10. Contact &amp; complaints</h2>
        <p>
          Write to {business.email} with any privacy question or complaint. If you are
          not satisfied, you may complain to the ODPC via www.odpc.go.ke.
        </p>
      </div>
    </div>
  );
}
