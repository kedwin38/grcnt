import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.appUrl.replace(/\/$/, "");
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${base}/shop`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/about`, lastModified: now, priority: 0.5 },
    { url: `${base}/faq`, lastModified: now, priority: 0.5 },
    { url: `${base}/support`, lastModified: now, priority: 0.6 },
    { url: `${base}/terms`, lastModified: now, priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, priority: 0.3 },
    { url: `${base}/refunds`, lastModified: now, priority: 0.3 },
  ];

  try {
    const products = await db.product.findMany({
      where: { active: true },
      select: { slug: true, updatedAt: true },
      take: 500,
    });
    return [
      ...staticPages,
      ...products.map((p) => ({
        url: `${base}/product/${p.slug}`,
        lastModified: p.updatedAt,
        priority: 0.8,
      })),
    ];
  } catch {
    return staticPages;
  }
}
