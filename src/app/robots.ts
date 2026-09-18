import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // /admin is deliberately not listed here — it 404s for anyone
        // without a session already, and listing it in robots.txt would
        // only serve as a signpost for anyone scanning for an admin panel.
        userAgent: "*",
        allow: "/",
        disallow: ["/account", "/api/", "/checkout", "/cart"],
      },
    ],
    sitemap: `${env.appUrl.replace(/\/$/, "")}/sitemap.xml`,
  };
}
