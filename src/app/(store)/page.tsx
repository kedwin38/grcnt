import Link from "next/link";
import {
  BadgeCheck,
  ChevronRight,
  ClipboardCheck,
  CreditCard,
  Headset,
  Layers,
  Lock,
  PackageCheck,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Timer,
  Users,
  Wallet,
} from "lucide-react";
import { db } from "@/lib/db";
import { getSettingGroup } from "@/lib/settings";
import { toCardProduct } from "@/lib/catalog";
import { ProductCard } from "@/components/store/ProductCard";
import { CategoryIcon } from "@/components/store/categoryIcon";
import { Reveal } from "@/components/store/Reveal";
import { CountUp } from "@/components/store/CountUp";
import { prettyPhone } from "@/lib/format";

// A small cycling palette so the category grid reads as a designed
// collage rather than one flat green tile repeated N times.
const CATEGORY_TINTS = [
  { border: "border-brand-100", iconBg: "bg-brand-100", iconText: "text-brand-600" },
  { border: "border-amber-100", iconBg: "bg-amber-100", iconText: "text-amber-600" },
  { border: "border-sky-100", iconBg: "bg-sky-100", iconText: "text-sky-600" },
  { border: "border-violet-100", iconBg: "bg-violet-100", iconText: "text-violet-600" },
  { border: "border-rose-100", iconBg: "bg-rose-100", iconText: "text-rose-600" },
];

export default async function HomePage() {
  const business = await getSettingGroup("business");

  const [categories, featured, fulfilledOrders, customerCount, productCount] = await Promise.all([
    db.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: { where: { active: true } } } } },
    }),
    db.product.findMany({
      where: { active: true, featured: true },
      include: { category: true },
      orderBy: { sortOrder: "asc" },
      take: 8,
    }),
    db.order.count({ where: { status: { in: ["PAID", "PROCESSING", "COMPLETED"] } } }),
    db.user.count({ where: { role: "CUSTOMER" } }),
    db.product.count({ where: { active: true } }),
  ]);

  // Below a small threshold, real order/customer counts read as embarrassing
  // rather than reassuring — show durable capability claims instead until
  // the shop has enough volume for the numbers to do their job.
  const hasTraction = fulfilledOrders >= 10 && customerCount >= 10;
  const stats = hasTraction
    ? [
        { icon: PackageCheck, value: fulfilledOrders, suffix: "+", label: "Orders fulfilled" },
        { icon: Users, value: customerCount, suffix: "+", label: "Customers served" },
        { icon: Smartphone, value: productCount, suffix: "", label: "Products live now" },
        { icon: Timer, value: 10, suffix: "s", label: "Avg. top-up delivery" },
      ]
    : [
        { icon: Smartphone, value: productCount, suffix: "", label: "Products live now" },
        { icon: Layers, value: categories.length, suffix: "", label: "Categories to shop" },
        { icon: Timer, value: 10, suffix: "s", label: "Avg. top-up delivery" },
        { icon: Lock, value: 100, suffix: "%", label: "M-Pesa secured checkout" },
      ];

  const bundleCategories = categories.filter((c) => c.showOnHome).slice(0, 4);
  const bundleSections = await Promise.all(
    bundleCategories.map(async (cat) => ({
      cat,
      products: await db.product.findMany({
        where: { active: true, categoryId: cat.id },
        include: { category: true },
        orderBy: { sortOrder: "asc" },
        take: 4,
      }),
    }))
  );

  return (
    <>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-950 text-white">
        <div className="absolute inset-0" aria-hidden="true">
          <div className="absolute -top-32 -right-24 w-[34rem] h-[34rem] rounded-full bg-brand-600/30 blur-3xl" />
          <div className="absolute -bottom-40 -left-24 w-[28rem] h-[28rem] rounded-full bg-brand-800/60 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.07]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)",
              backgroundSize: "26px 26px",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-16 sm:py-24 grid lg:grid-cols-2 gap-14 items-center">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-4 py-1.5 text-[13px] font-semibold text-brand-200">
              <BadgeCheck className="w-4 h-4" />
              Trusted Safaricom products reseller in Kenya
            </div>
            <h1 className="hero-title mt-5 text-[2.75rem] sm:text-6xl">
              Everything Safaricom.
              <span className="block text-brand-300 italic">One green shop.</span>
            </h1>
            <p className="mt-5 text-lg text-white/70 leading-relaxed max-w-lg">
              Data bundles, airtime, minutes and the latest phones — at prices that
              respect your pocket. Pay securely with M-Pesa and get instant top-ups.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/shop" className="btn btn-lg bg-white text-brand-800 hover:bg-brand-50 hover:shadow-glow">
                <Sparkles className="w-4.5 h-4.5" /> Shop bundles
              </Link>
              <Link
                href="/shop?cat=phones"
                className="btn btn-lg border border-white/25 text-white hover:bg-white/10"
              >
                <Smartphone className="w-4.5 h-4.5" /> Browse phones
              </Link>
            </div>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3 text-[13px] font-medium text-white/65">
              <span className="flex items-center gap-2">
                <ShieldCheck className="w-4.5 h-4.5 text-brand-300" /> M-Pesa secured payments
              </span>
              <span className="flex items-center gap-2">
                <Timer className="w-4.5 h-4.5 text-brand-300" /> Instant top-up delivery
              </span>
              <span className="flex items-center gap-2">
                <BadgeCheck className="w-4.5 h-4.5 text-brand-300" /> Genuine products
              </span>
            </div>
          </div>

          {/* Hero visual: familiar STK prompt + bundle card (Jakob's law — trust through recognition) */}
          <div className="relative hidden lg:block animate-fade-in" aria-hidden="true">
            <div className="absolute right-4 -top-2 w-64 card p-4 rotate-3 animate-fade-up" style={{ animationDelay: "0.15s" }}>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                  <CategoryIcon name="wifi" className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-ink text-sm">30 GB Data Bundle</div>
                  <div className="text-xs text-ink-mute">Valid 7 days</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-lg font-extrabold text-ink">KSh 1,000</span>
                <span className="badge badge-green">Best value</span>
              </div>
            </div>

            <div className="relative mt-24 ml-10 w-80 card p-5 -rotate-2 shadow-lift animate-fade-up" style={{ animationDelay: "0.05s" }}>
              <div className="flex items-center gap-2 pb-3 border-b border-line">
                <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-brand-700" />
                </div>
                <div className="text-[13px] font-bold text-ink">M-Pesa</div>
                <span className="ml-auto badge badge-green">
                  <ShieldCheck className="w-3 h-3" /> Secure
                </span>
              </div>
              <div className="py-3 space-y-2 text-[13px]">
                <div className="flex justify-between">
                  <span className="text-ink-mute">Pay to</span>
                  <span className="font-semibold text-ink">{business.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-mute">Till number</span>
                  <span className="font-semibold text-ink">{business.tillNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-ink-mute">Amount</span>
                  <span className="font-extrabold text-brand-700">KSh 1,000</span>
                </div>
              </div>
              <div className="rounded-xl bg-brand-500 text-white text-center text-sm font-bold py-2.5">
                Enter M-Pesa PIN
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-brand-700">
                <PackageCheck className="w-3.5 h-3.5" /> Top-up delivered in seconds
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider into the (white) trust bar below */}
        <svg
          viewBox="0 0 1440 48"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 w-full h-8 sm:h-12 pointer-events-none"
          aria-hidden="true"
        >
          <path d="M0,24 C240,48 480,0 720,12 C960,24 1200,48 1440,24 L1440,48 L0,48 Z" fill="#ffffff" />
        </svg>
      </section>

      {/* ── Trust bar ─────────────────────────────────────────────────────── */}
      <section className="border-b border-line bg-surface">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { icon: Timer, title: "Instant delivery", text: "Top-ups processed in seconds", tint: "bg-brand-100 text-brand-600" },
            { icon: ShieldCheck, title: "Pay with M-Pesa", text: "Till " + business.tillNumber + " — STK push, no hassle", tint: "bg-sky-100 text-sky-600" },
            { icon: Sparkles, title: "Fair prices", text: "Bundle deals updated weekly", tint: "bg-amber-100 text-amber-600" },
            { icon: Headset, title: "Real human support", text: "Talk to us on " + prettyPhone(business.phone), tint: "bg-violet-100 text-violet-600" },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${f.tint}`}>
                <f.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-sm font-bold text-ink">{f.title}</div>
                <div className="text-[13px] text-ink-mute leading-snug">{f.text}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats band (social proof) ────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-brand-950 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 90} className="text-center lg:text-left">
              <div className="flex items-center justify-center lg:justify-start gap-2.5">
                <s.icon className="w-5 h-5 text-brand-400" />
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                  <CountUp value={s.value} suffix={s.suffix} />
                </div>
              </div>
              <div className="mt-1 text-[13px] text-white/60 font-medium">{s.label}</div>
            </Reveal>
          ))}
        </div>

        {/* Wave divider into the (paper) categories section below */}
        <svg
          viewBox="0 0 1440 48"
          preserveAspectRatio="none"
          className="absolute bottom-0 left-0 w-full h-8 sm:h-12 pointer-events-none"
          aria-hidden="true"
        >
          <path d="M0,24 C240,0 480,48 720,36 C960,24 1200,0 1440,24 L1440,48 L0,48 Z" fill="#fbfdf9" />
        </svg>
      </section>

      {/* ── Categories ────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10" aria-hidden="true">
          <div className="absolute -top-10 right-0 w-72 h-72 rounded-full bg-brand-100/50 blur-3xl" />
          <div className="absolute top-52 -left-20 w-64 h-64 rounded-full bg-amber-100/40 blur-3xl" />
        </div>
        <div className="mx-auto max-w-7xl px-4 sm:px-6 pt-14">
          <Reveal className="flex items-end justify-between gap-4">
            <div>
              <div className="section-eyebrow">Categories</div>
              <h2 className="section-title mt-1">What can we get you today?</h2>
            </div>
            <Link href="/shop" className="btn btn-md btn-outline shrink-0">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </Reveal>
          <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {categories.map((cat, i) => {
              const tint = CATEGORY_TINTS[i % CATEGORY_TINTS.length];
              const tilt = i % 2 === 0 ? "-rotate-1" : "rotate-1";
              return (
                <Reveal key={cat.id} delay={i * 60}>
                  <Link
                    href={`/shop?cat=${cat.slug}`}
                    className={`card card-hover p-5 flex flex-col items-center text-center gap-2.5 group ${tilt} hover:rotate-0 ${tint.border}`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 ${tint.iconBg}`}>
                      <CategoryIcon name={cat.icon} className={`w-6 h-6 ${tint.iconText}`} />
                    </div>
                    <div className="font-bold text-sm text-ink">{cat.name}</div>
                    <div className="text-xs text-ink-mute">
                      {cat._count.products} product{cat._count.products === 1 ? "" : "s"}
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Bundle sections ───────────────────────────────────────────────── */}
      {bundleSections.map(({ cat, products }, sectionIndex) => {
        if (products.length === 0) return null;
        const tinted = sectionIndex % 2 === 1;
        return (
          <div key={cat.id} className={tinted ? "bg-brand-50/40" : undefined}>
            <section className={`mx-auto max-w-7xl px-4 sm:px-6 pt-14 ${tinted ? "pb-14" : ""}`}>
              <Reveal className="flex items-end justify-between gap-4">
                <div>
                  <div className="section-eyebrow">{cat.name}</div>
                  <h2 className="section-title mt-1">
                    {cat.slug.includes("data")
                      ? "Stay connected for less"
                      : cat.slug.includes("minute")
                        ? "Talk more, pay less"
                        : cat.slug.includes("airtime")
                          ? "Top up in a tap"
                          : cat.slug.includes("wifi") || cat.slug.includes("router")
                            ? "Router packages, sorted"
                            : cat.name}
                  </h2>
                </div>
                <Link href={`/shop?cat=${cat.slug}`} className="btn btn-md btn-outline shrink-0">
                  See all <ChevronRight className="w-4 h-4" />
                </Link>
              </Reveal>
              <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
                {products.map((p, i) => (
                  <Reveal key={p.id} delay={i * 60}>
                    <ProductCard product={toCardProduct(p)} />
                  </Reveal>
                ))}
              </div>
            </section>
          </div>
        );
      })}

      {/* ── Featured phones ───────────────────────────────────────────────── */}
      {featured.length > 0 ? (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-14">
          <Reveal className="flex items-end justify-between gap-4">
            <div>
              <div className="section-eyebrow">Devices</div>
              <h2 className="section-title mt-1">Featured phones</h2>
            </div>
            <Link href="/shop?cat=phones" className="btn btn-md btn-outline shrink-0">
              All phones <ChevronRight className="w-4 h-4" />
            </Link>
          </Reveal>
          <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {featured.map((p, i) => (
              <Reveal key={p.id} delay={i * 60}>
                <ProductCard product={toCardProduct(p)} />
              </Reveal>
            ))}
          </div>
        </section>
      ) : null}

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 pt-20">
        <Reveal className="rounded-3xl bg-gradient-to-br from-brand-900 to-brand-950 text-white px-6 sm:px-12 py-12 sm:py-16 relative overflow-hidden">
          <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full bg-brand-600/25 blur-3xl animate-float" aria-hidden="true" />
          <div className="relative">
            <div className="text-brand-300 font-bold text-[13px] uppercase tracking-[0.14em]">
              How it works
            </div>
            <h2 className="hero-title text-2xl sm:text-3xl mt-1">
              From cart to connected in three steps
            </h2>
            <div className="mt-10 grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: ClipboardCheck,
                  step: "1",
                  title: "Pick what you need",
                  text: "Browse bundles, airtime, minutes or phones and add them to your cart.",
                },
                {
                  icon: CreditCard,
                  step: "2",
                  title: "Pay with M-Pesa",
                  text: `Check out and enter your PIN on the M-Pesa prompt — straight to our till ${business.tillNumber}.`,
                },
                {
                  icon: PackageCheck,
                  step: "3",
                  title: "Get it instantly",
                  text: "Bundles and airtime land on your line in seconds. Phones are delivered or ready for pickup.",
                },
              ].map((s, i) => (
                <Reveal key={s.step} delay={i * 120} className="relative group">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 group-hover:bg-white/15">
                      <s.icon className="w-5 h-5 text-brand-300" />
                    </div>
                    <span className="text-4xl font-extrabold text-white/15 absolute -top-4 right-1 select-none">
                      {s.step}
                    </span>
                  </div>
                  <h3 className="mt-4 font-bold text-lg">{s.title}</h3>
                  <p className="mt-1.5 text-white/65 text-[15px] leading-relaxed">{s.text}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Support CTA ───────────────────────────────────────────────────── */}
      <Reveal className="mx-auto max-w-7xl px-4 sm:px-6 pt-14">
        <div className="relative overflow-hidden card card-hover p-8 sm:p-10 flex flex-col sm:flex-row items-start sm:items-center gap-6 justify-between">
          <div className="absolute -right-16 -bottom-20 w-56 h-56 rounded-full bg-brand-100/60 blur-3xl" aria-hidden="true" />
          <div className="flex items-start gap-4 relative">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
              <Headset className="w-6 h-6 text-brand-600" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-ink tracking-tight">
                Need help choosing a bundle?
              </h2>
              <p className="text-ink-soft mt-1 max-w-xl">
                Our team knows Safaricom products inside out. Send us a message and we&apos;ll
                reply right here on the site — or call {prettyPhone(business.phone)}.
              </p>
            </div>
          </div>
          <Link href="/support" className="btn btn-lg btn-primary shrink-0">
            Talk to support
          </Link>
        </div>
      </Reveal>

      {/* Homepage structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Store",
            name: business.name,
            description: business.description,
            telephone: `+${business.phone}`,
            email: business.email,
            address: { "@type": "PostalAddress", addressLocality: business.location },
            paymentAccepted: "M-Pesa",
            openingHours: business.openHours,
          }),
        }}
      />
    </>
  );
}
