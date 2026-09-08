import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { Mail, MapPin, Phone, Clock } from "lucide-react";
import { prettyPhone } from "@/lib/format";
import type { BusinessSettings } from "@/lib/settings";

export function Footer({
  business,
  categories,
}: {
  business: BusinessSettings;
  categories: { name: string; slug: string }[];
}) {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-brand-950 text-white/80 mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-14 grid gap-10 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="[&_span]:!text-white">
            <Logo name={business.name} light />
          </div>
          <p className="mt-4 text-sm leading-relaxed text-white/60 max-w-xs">
            {business.tagline}. Genuine Safaricom products — data bundles, airtime,
            minutes and phones — with fast, secure M-Pesa payments.
          </p>
          <div className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-3.5 py-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-white/50">
              M-Pesa Till
            </span>
            <span className="font-extrabold text-white tracking-wide">{business.tillNumber}</span>
          </div>
        </div>

        <nav aria-label="Categories">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Shop</h3>
          <ul className="space-y-2.5 text-sm">
            {categories.slice(0, 6).map((c) => (
              <li key={c.slug}>
                <Link href={`/shop?cat=${c.slug}`} className="hover:text-brand-300 transition-colors">
                  {c.name}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/shop" className="hover:text-brand-300 transition-colors font-semibold">
                View all products →
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Company">
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Company</h3>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/about" className="hover:text-brand-300 transition-colors">About us</Link></li>
            <li><Link href="/orders/track" className="hover:text-brand-300 transition-colors">Track your order</Link></li>
            <li><Link href="/support" className="hover:text-brand-300 transition-colors">Support &amp; enquiries</Link></li>
            <li><Link href="/faq" className="hover:text-brand-300 transition-colors">FAQ</Link></li>
          </ul>
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mt-7 mb-4">Legal</h3>
          <ul className="space-y-2.5 text-sm">
            <li><Link href="/terms" className="hover:text-brand-300 transition-colors">Terms &amp; Conditions</Link></li>
            <li><Link href="/privacy" className="hover:text-brand-300 transition-colors">Privacy Policy</Link></li>
            <li><Link href="/refunds" className="hover:text-brand-300 transition-colors">Refunds &amp; Returns</Link></li>
          </ul>
        </nav>

        <div>
          <h3 className="text-white font-bold text-sm uppercase tracking-wider mb-4">Reach us</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-start gap-2.5">
              <Phone className="w-4 h-4 mt-0.5 text-brand-300 shrink-0" />
              <a href={`tel:+${business.phone}`} className="hover:text-brand-300">
                {prettyPhone(business.phone)}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <Mail className="w-4 h-4 mt-0.5 text-brand-300 shrink-0" />
              <a href={`mailto:${business.email}`} className="hover:text-brand-300 break-all">
                {business.email}
              </a>
            </li>
            <li className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 mt-0.5 text-brand-300 shrink-0" />
              <span>{business.location}</span>
            </li>
            <li className="flex items-start gap-2.5">
              <Clock className="w-4 h-4 mt-0.5 text-brand-300 shrink-0" />
              <span>{business.openHours}</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-white/50">
          <p>
            © {year} {business.legalName}. All rights reserved.
          </p>
          <p className="flex items-center gap-1.5">
            Payments secured by M-Pesa · {business.legalName} is an independent reseller of
            Safaricom products and is not owned by or affiliated with Safaricom PLC.
          </p>
        </div>
      </div>
    </footer>
  );
}
