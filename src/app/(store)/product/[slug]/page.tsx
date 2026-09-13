import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, ChevronRight, PackageCheck, ShieldCheck, Timer, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { formatKES } from "@/lib/format";
import { parseAttributes, parseFields, parseImages } from "@/lib/catalog";
import { ProductAction } from "@/components/store/ProductAction";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    include: { category: true },
  });
  if (!product) return { title: "Product not found" };
  return {
    title: `${product.name} — ${formatKES(product.price)}`,
    description:
      product.description?.slice(0, 160) ||
      `Buy ${product.name} at ${formatKES(product.price)} from Green Color Networks. Pay securely with M-Pesa.`,
    openGraph: {
      title: product.name,
      description: product.description?.slice(0, 200) || "",
      images: parseImages(product)[0]
        ? [{ url: `${env.appUrl}/api/img/${parseImages(product)[0].id}` }]
        : undefined,
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await db.product.findUnique({
    where: { slug },
    include: { category: true },
  });
  if (!product || !product.active) notFound();

  const images = parseImages(product);
  const fields = parseFields(product.category);
  const attrs = parseAttributes(product);
  const specs = fields.filter((f) => attrs[f.key] !== undefined && attrs[f.key] !== "");
  const soldOut = product.stock !== null && product.stock <= 0;

  const cardData = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    imageId: images[0]?.id ?? null,
    categoryName: product.category.name,
    categoryIcon: product.category.icon,
    stock: product.stock,
    instant: product.category.instantTopup,
    requiresRouterNumber: product.category.requiresRouterNumber,
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 py-8">
      {/* Breadcrumb */}
      <nav className="text-[13px] text-ink-mute flex items-center gap-1.5 flex-wrap" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-brand-700">Home</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href="/shop" className="hover:text-brand-700">Shop</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link href={`/shop?cat=${product.category.slug}`} className="hover:text-brand-700">
          {product.category.name}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-ink font-medium truncate max-w-48">{product.name}</span>
      </nav>

      <div className="mt-6 grid lg:grid-cols-2 gap-10">
        {/* Visual */}
        <div>
          {images[0] ? (
            <div className="card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/img/${images[0].id}`}
                alt={images[0].alt || product.name}
                className="w-full aspect-square object-cover"
              />
            </div>
          ) : (
            <div className="card overflow-hidden">
              <div className="w-full aspect-square bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 flex flex-col items-center justify-center text-white relative">
                <div className="absolute -right-16 -bottom-16 w-64 h-64 rounded-full bg-white/10" aria-hidden="true" />
                <div className="absolute -left-12 -top-12 w-40 h-40 rounded-full bg-white/10" aria-hidden="true" />
                <span className="text-5xl font-extrabold tracking-tight drop-shadow">
                  {specs[0] ? `${attrs[specs[0].key]}${specs[0].unit ? ` ${specs[0].unit}` : ""}` : product.category.name}
                </span>
                <span className="mt-2 text-white/75 font-semibold text-lg">{product.category.name}</span>
              </div>
            </div>
          )}
        </div>

        {/* Purchase panel */}
        <div>
          <Link
            href={`/shop?cat=${product.category.slug}`}
            className="text-brand-600 font-bold text-[13px] uppercase tracking-wider"
          >
            {product.category.name}
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight text-ink mt-1.5">{product.name}</h1>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold text-ink">{formatKES(product.price)}</span>
            {product.compareAtPrice && product.compareAtPrice > product.price ? (
              <>
                <span className="text-lg text-ink-mute line-through">
                  {formatKES(product.compareAtPrice)}
                </span>
                <span className="badge badge-green">
                  Save {formatKES(product.compareAtPrice - product.price)}
                </span>
              </>
            ) : null}
          </div>

          {product.description ? (
            <p className="mt-4 text-ink-soft leading-relaxed">{product.description}</p>
          ) : null}

          {specs.length > 0 ? (
            <dl className="mt-6 grid grid-cols-2 gap-3">
              {specs.map((f) => (
                <div key={f.key} className="rounded-xl border border-line bg-surface px-4 py-3">
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-ink-mute">
                    {f.label}
                  </dt>
                  <dd className="font-bold text-ink mt-0.5">
                    {attrs[f.key]}
                    {f.unit ? ` ${f.unit}` : ""}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div className="mt-4">
            {soldOut ? (
              <span className="badge badge-gray text-sm px-4 py-2">Sold out — restocking soon</span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-700">
                <Check className="w-4 h-4" />
                {product.stock !== null
                  ? `${product.stock} in stock — order today`
                  : product.category.requiresRouterNumber
                    ? "Available — loaded onto your router after payment"
                    : "Available — delivered instantly after payment"}
              </span>
            )}
          </div>

          <ProductAction product={cardData} />

          {/* Trust reassurance — safety perception at the decision point */}
          <div className="mt-7 card divide-y divide-line">
            {[
              {
                icon: ShieldCheck,
                title: "Pay securely with M-Pesa",
                text: "Your PIN stays between you and Safaricom — we never see it.",
              },
              {
                icon: Timer,
                title: product.category.instantTopup
                  ? "Instant top-up delivery"
                  : product.category.requiresRouterNumber
                    ? "Loaded onto your router"
                    : "Fast, insured delivery",
                text: product.category.instantTopup
                  ? "Top-ups land on your line seconds after payment."
                  : product.category.requiresRouterNumber
                    ? "Enter your router number at checkout — our team loads the package onto it shortly after payment."
                    : "Carefully packed. Delivery or pickup — your choice at checkout.",
              },
              {
                icon: PackageCheck,
                title: "Genuine products",
                text: "Everything we sell is authentic and covered by our support team.",
              },
            ].map((row) => (
              <div key={row.title} className="flex items-start gap-3 px-5 py-4">
                <row.icon className="w-5 h-5 text-brand-600 shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-bold text-ink">{row.title}</div>
                  <div className="text-[13px] text-ink-mute">{row.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            description: product.description || product.name,
            category: product.category.name,
            offers: {
              "@type": "Offer",
              priceCurrency: "KES",
              price: product.price,
              availability: soldOut
                ? "https://schema.org/OutOfStock"
                : "https://schema.org/InStock",
            },
          }),
        }}
      />
    </div>
  );
}
