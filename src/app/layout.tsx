import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { getAllSettings } from "@/lib/settings";

// Everything below reads the database at request time (settings, products,
// prices) — so the whole app renders dynamically per request.
export const dynamic = "force-dynamic";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { seo, business } = await getAllSettings();
  return {
    metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
    title: {
      default: seo.siteTitle,
      template: `%s · ${business.name}`,
    },
    description: seo.siteDescription,
    keywords: seo.keywords.split(",").map((k) => k.trim()).filter(Boolean),
    applicationName: business.name,
    openGraph: {
      title: seo.siteTitle,
      description: seo.siteDescription,
      siteName: business.name,
      type: "website",
      locale: "en_KE",
    },
    twitter: { card: "summary_large_image", title: seo.siteTitle, description: seo.siteDescription },
    icons: { icon: "/icon.svg" },
    robots: { index: true, follow: true },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-KE" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  );
}
