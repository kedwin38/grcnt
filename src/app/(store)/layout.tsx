import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { getSettingGroup } from "@/lib/settings";
import { CartProvider } from "@/components/store/CartProvider";
import { Header } from "@/components/store/Header";
import { Footer } from "@/components/store/Footer";
import { WhatsAppFloat } from "@/components/store/WhatsAppFloat";

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const [business, categories, user] = await Promise.all([
    getSettingGroup("business"),
    db.category.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { name: true, slug: true },
    }),
    currentUser(),
  ]);

  return (
    <CartProvider>
      <div className="flex min-h-screen flex-col">
        <Header
          businessName={business.name}
          announcement={business.announcement || undefined}
          categories={categories}
          user={user ? { name: user.name, role: user.role } : null}
        />
        <main className="flex-1">{children}</main>
        <Footer business={business} categories={categories} />
        <WhatsAppFloat phone={business.whatsapp} label={business.name} />
      </div>
    </CartProvider>
  );
}
