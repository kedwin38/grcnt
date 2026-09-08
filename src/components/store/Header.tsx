"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogOut, Menu, PackageSearch, ShoppingCart, User, X, ChevronDown, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useCart } from "./CartProvider";
import { api } from "@/lib/client";

export type HeaderUser = { name: string; role: "CUSTOMER" | "STAFF" | "ADMIN" } | null;

export function Header({
  businessName,
  announcement,
  categories,
  user,
}: {
  businessName: string;
  announcement?: string;
  categories: { name: string; slug: string }[];
  user: HeaderUser;
}) {
  const { count } = useCart();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMenuOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (accountRef.current && !accountRef.current.contains(e.target as Node)) {
        setAccountOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      /* session cleared regardless */
    }
    router.push("/");
    router.refresh();
  }

  const nav = [
    { href: "/", label: "Home" },
    { href: "/shop", label: "Shop" },
    { href: "/orders/track", label: "Track Order" },
    { href: "/support", label: "Support" },
  ];

  return (
    <>
      {announcement ? (
        <div className="bg-brand-900 text-white text-center text-[13px] font-medium px-4 py-2">
          {announcement}
        </div>
      ) : null}

      <header className="sticky top-0 z-40 bg-surface/85 backdrop-blur-md border-b border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="flex h-16 items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                className="btn btn-sm btn-ghost lg:hidden -ml-2"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label={menuOpen ? "Close menu" : "Open menu"}
                aria-expanded={menuOpen}
              >
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <Logo name={businessName} />
            </div>

            <nav className="hidden lg:flex items-center gap-1" aria-label="Main">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                    pathname === item.href
                      ? "text-brand-700 bg-brand-50"
                      : "text-ink-soft hover:text-brand-700 hover:bg-brand-50/60"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-1.5">
              {user && user.role !== "CUSTOMER" ? (
                <Link
                  href="/admin"
                  className="hidden sm:inline-flex btn btn-sm btn-outline"
                  title="Back office"
                >
                  <ShieldCheck className="w-3.5 h-3.5" /> Admin
                </Link>
              ) : null}

              {user ? (
                <div className="relative" ref={accountRef}>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={() => setAccountOpen((v) => !v)}
                    aria-haspopup="menu"
                    aria-expanded={accountOpen}
                  >
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline max-w-28 truncate">
                      {user.name.split(" ")[0]}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {accountOpen ? (
                    <div
                      role="menu"
                      className="absolute right-0 mt-2 w-52 card p-1.5 shadow-lift animate-fade-in"
                    >
                      <Link href="/orders" className="block px-3 py-2.5 rounded-lg text-sm font-medium text-ink-soft hover:bg-brand-50 hover:text-brand-700">
                        My Orders
                      </Link>
                      <Link href="/account" className="block px-3 py-2.5 rounded-lg text-sm font-medium text-ink-soft hover:bg-brand-50 hover:text-brand-700">
                        Profile
                      </Link>
                      <Link href="/support" className="block px-3 py-2.5 rounded-lg text-sm font-medium text-ink-soft hover:bg-brand-50 hover:text-brand-700">
                        Support
                      </Link>
                      <hr className="my-1 border-line" />
                      <button
                        onClick={logout}
                        className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <LogOut className="w-4 h-4" /> Log out
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : (
                <Link href="/login" className="hidden sm:inline-flex btn btn-sm btn-outline">
                  <User className="w-4 h-4" /> Log in
                </Link>
              )}

              <Link
                href="/cart"
                className="relative btn btn-sm btn-primary"
                aria-label={`Cart, ${count} items`}
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">Cart</span>
                {count > 0 ? (
                  <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-brand-900 text-white text-[11px] font-bold flex items-center justify-center">
                    {count}
                  </span>
                ) : null}
              </Link>
            </div>
          </div>
        </div>

        {/* Mobile drawer */}
        {menuOpen ? (
          <div className="lg:hidden border-t border-line bg-surface animate-fade-in">
            <nav className="px-4 py-3 space-y-1" aria-label="Mobile">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`block px-3 py-3 rounded-xl text-sm font-semibold ${
                    pathname === item.href
                      ? "text-brand-700 bg-brand-50"
                      : "text-ink-soft hover:bg-brand-50/60"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
              {!user ? (
                <Link href="/login" className="block px-3 py-3 rounded-xl text-sm font-semibold text-ink-soft hover:bg-brand-50/60">
                  Log in / Register
                </Link>
              ) : null}
              {user && user.role !== "CUSTOMER" ? (
                <Link href="/admin" className="block px-3 py-3 rounded-xl text-sm font-semibold text-ink-soft hover:bg-brand-50/60">
                  Admin back office
                </Link>
              ) : null}
            </nav>
            {categories.length > 0 ? (
              <div className="px-4 pb-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-ink-mute mb-2 px-3">
                  Shop by category
                </div>
                <div className="flex flex-wrap gap-1.5 px-1">
                  {categories.map((c) => (
                    <Link
                      key={c.slug}
                      href={`/shop?cat=${c.slug}`}
                      className="px-3 py-1.5 rounded-full border border-line text-xs font-semibold text-ink-soft hover:border-brand-400 hover:text-brand-700"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </header>
    </>
  );
}
