import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, Clock, HandCoins, MapPin, Phone, Users } from "lucide-react";
import { getSettingGroup } from "@/lib/settings";
import { prettyPhone } from "@/lib/format";

export const metadata: Metadata = {
  title: "About us",
  description: "Green Color Networks — a trusted Kenyan reseller of Safaricom products.",
};

export default async function AboutPage() {
  const business = await getSettingGroup("business");
  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-6 py-12">
      <div className="section-eyebrow">About</div>
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1">
        Neighbourhood trust, <span className="text-brand-600">online</span>.
      </h1>
      <p className="text-ink-soft text-lg leading-relaxed mt-4 max-w-2xl">
        {business.description}
      </p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
        {[
          {
            icon: BadgeCheck,
            title: "Genuine, always",
            text: "Every bundle, top-up and device we sell is authentic. No grey imports, no shortcuts.",
          },
          {
            icon: HandCoins,
            title: "Fair, clear prices",
            text: "What you see is what you pay — in Kenya Shillings, with no hidden charges.",
          },
          {
            icon: Users,
            title: "People, not bots",
            text: "Real support from people who know Safaricom products inside out.",
          },
        ].map((card) => (
          <div key={card.title} className="card p-6">
            <div className="w-11 h-11 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center">
              <card.icon className="w-5.5 h-5.5 text-brand-600" />
            </div>
            <h2 className="font-extrabold text-ink mt-3.5">{card.title}</h2>
            <p className="text-[14px] text-ink-soft mt-1.5 leading-relaxed">{card.text}</p>
          </div>
        ))}
      </div>

      <div className="card p-7 mt-8">
        <h2 className="font-extrabold text-lg text-ink">Find us &amp; reach us</h2>
        <div className="grid sm:grid-cols-2 gap-5 mt-5 text-[15px]">
          <div className="flex items-start gap-3">
            <MapPin className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-ink">Visit the shop</div>
              <div className="text-ink-soft">{business.location}</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-ink">Opening hours</div>
              <div className="text-ink-soft">{business.openHours}</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-ink">Call / SMS / WhatsApp</div>
              <a href={`tel:+${business.phone}`} className="text-ink-soft hover:text-brand-700">
                {prettyPhone(business.phone)}
              </a>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <HandCoins className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold text-ink">M-Pesa Till</div>
              <div className="text-ink-soft font-bold">{business.tillNumber}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 card p-7 bg-gradient-to-br from-brand-900 to-brand-950 text-white border-0">
        <h2 className="font-extrabold text-lg">Ready to shop?</h2>
        <p className="text-white/70 mt-1.5 max-w-xl">
          Browse the shelves — bundles, airtime, minutes and phones — and pay the
          Kenyan way: M-Pesa, till number {business.tillNumber}.
        </p>
        <Link href="/shop" className="btn btn-lg bg-white text-brand-800 hover:bg-brand-50 mt-5">
          Start shopping
        </Link>
      </div>
    </div>
  );
}
