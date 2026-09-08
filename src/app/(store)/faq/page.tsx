import type { Metadata } from "next";
import Link from "next/link";
import { getSettingGroup } from "@/lib/settings";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about paying, delivery, top-ups and more.",
};

const FAQS = (till: string) => [
  {
    q: "How do I pay?",
    a: `Choose your items, check out, and an M-Pesa prompt appears on your phone. Enter your M-Pesa PIN and that's it — payment goes to our till number ${till}. No cards, no apps to install.`,
  },
  {
    q: "I didn't get the M-Pesa prompt. What now?",
    a: "On the payment page, tap “Cancel and retry”. Make sure your phone is on, has airtime/network, and M-Pesa is active. Still stuck? Contact support and we'll sort it in minutes.",
  },
  {
    q: "How fast do bundles and airtime arrive?",
    a: "Typically within seconds of your payment confirming — our team is notified instantly and tops up the line you nominated. If it hasn't arrived in 30 minutes, message support with your order code and we'll trace or refund it.",
  },
  {
    q: "Can I top up a different number from mine?",
    a: "Yes! At checkout, enter the Safaricom number that should receive the bundles/airtime. It can be any Safaricom line — yours, your mum's, your employee's.",
  },
  {
    q: "How do phone deliveries work?",
    a: "Pick Delivery or Pickup at checkout. For delivery, enter your address — we'll call to confirm timing after payment. For pickup, pay online and collect at our shop without queuing.",
  },
  {
    q: "Are the phones genuine?",
    a: "100%. We stock genuine devices with manufacturer warranty where applicable. If anything is wrong out of the box, our 7-day return policy has you covered.",
  },
  {
    q: "What if I enter the wrong top-up number?",
    a: "Double-check before you pay! A top-up already applied by Safaricom can't be reversed. If you catch it early, contact support immediately and we'll try to stop it before it goes through.",
  },
  {
    q: "How do I track my order?",
    a: "Logged in? Check “My Orders” anytime. Otherwise use “Track Order” with the GCN- code we showed (and emailed) at checkout plus your phone number.",
  },
  {
    q: "Is it safe to buy here? How do I know you're real?",
    a: `We're a physical shop — visit us and see. Online, every payment goes through Safaricom's own M-Pesa system (we never see your PIN), every transaction has an M-Pesa receipt you keep, and our team answers on ${"call/WhatsApp"} whenever we're open.`,
  },
  {
    q: "Can I get a refund?",
    a: "Yes — undelivered top-ups are refunded in full, and faulty devices are returned/replaced within 7 days. See our Refunds & Returns page for the full policy.",
  },
];

export default async function FaqPage() {
  const business = await getSettingGroup("business");
  const faqs = FAQS(business.tillNumber);
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12">
      <div className="section-eyebrow">Help centre</div>
      <h1 className="section-title mt-1">Frequently asked questions</h1>
      <p className="text-ink-soft mt-2">
        Quick answers. Can&apos;t find yours?{" "}
        <Link href="/support" className="text-brand-700 font-semibold underline">
          Ask us directly
        </Link>
        .
      </p>

      <div className="mt-8 space-y-3">
        {faqs.map((faq, i) => (
          <details key={i} className="card group p-0 overflow-hidden">
            <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer font-bold text-ink text-[15px] list-none [&::-webkit-details-marker]:hidden">
              {faq.q}
              <span className="text-brand-600 text-xl leading-none transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="px-5 pb-5 text-ink-soft text-[14px] leading-relaxed">{faq.a}</p>
          </details>
        ))}
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: faqs.map((f) => ({
              "@type": "Question",
              name: f.q,
              acceptedAnswer: { "@type": "Answer", text: f.a },
            })),
          }),
        }}
      />
    </div>
  );
}
