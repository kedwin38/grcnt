"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Package,
  Layers,
  ShoppingCart,
  Users,
  Headset,
  UserCog,
  Settings,
  ScrollText,
  ExternalLink,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { LogoMark } from "@/components/brand/Logo";
import { api } from "@/lib/client";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: ["STAFF", "ADMIN"] },
  { href: "/admin/orders", label: "Orders", icon: ShoppingCart, roles: ["STAFF", "ADMIN"] },
  { href: "/admin/products", label: "Products", icon: Package, roles: ["STAFF", "ADMIN"] },
  { href: "/admin/categories", label: "Categories", icon: Layers, roles: ["STAFF", "ADMIN"] },
  { href: "/admin/customers", label: "Customers", icon: Users, roles: ["STAFF", "ADMIN"] },
  { href: "/admin/support", label: "Support inbox", icon: Headset, roles: ["STAFF", "ADMIN"] },
  { href: "/admin/staff", label: "Staff", icon: UserCog, roles: ["ADMIN"] },
  { href: "/admin/settings", label: "Settings", icon: Settings, roles: ["ADMIN"] },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText, roles: ["ADMIN"] },
];

export function AdminShell({
  user,
  children,
}: {
  user: { name: string; role: "STAFF" | "ADMIN" };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [newTickets, setNewTickets] = useState(0);

  useEffect(() => setMenuOpen(false), [pathname]);

  // Live badge for new support messages
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const data = await api<{ newCount: number }>("/api/admin/support/count");
        if (active) setNewTickets(data.newCount);
      } catch {
        /* ignore */
      }
    }
    load();
    const t = setInterval(load, 60_000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [pathname]);

  async function logout() {
    try {
      await api("/api/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    router.push("/admin/login");
    router.refresh();
  }

  const items = NAV.filter((n) => n.roles.includes(user.role));

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10">
        <LogoMark size={32} />
        <div className="leading-tight">
          <div className="text-white font-extrabold text-sm tracking-tight">Green Color</div>
          <div className="text-white/50 text-[10px] font-bold uppercase tracking-[0.14em]">
            Back office
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1" aria-label="Admin">
        {items.map((item) => {
          const active =
            item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
                active
                  ? "bg-white/12 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/6"
              }`}
            >
              <item.icon className="w-4.5 h-4.5 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.href === "/admin/support" && newTickets > 0 ? (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-brand-500 text-white text-[11px] font-bold flex items-center justify-center">
                  {newTickets > 9 ? "9+" : newTickets}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-white/10 p-3 space-y-1">
        <Link
          href="/"
          className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/6"
        >
          <ExternalLink className="w-4.5 h-4.5" /> View store
        </Link>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-white/60 hover:text-white hover:bg-white/6"
        >
          <LogOut className="w-4.5 h-4.5" /> Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper lg:grid lg:grid-cols-[260px_1fr]">
      <aside className="hidden lg:block bg-brand-950 sticky top-0 h-screen">{sidebar}</aside>

      {/* Mobile top bar */}
      <div className="lg:hidden bg-brand-950 sticky top-0 z-40 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <LogoMark size={28} />
          <span className="text-white font-extrabold text-sm">Back office</span>
        </div>
        <button
          className="text-white/70 hover:text-white"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>
      {menuOpen ? (
        <div className="lg:hidden bg-brand-950 border-t border-white/10 animate-fade-in">
          {sidebar}
        </div>
      ) : null}

      <div className="flex flex-col min-w-0">
        <header className="hidden lg:flex items-center justify-between px-8 h-16 border-b border-line bg-surface/70 backdrop-blur sticky top-0 z-30">
          <div className="text-[13px] text-ink-mute font-medium">
            {new Date().toLocaleDateString("en-KE", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-ink">{user.name}</span>
            <span className={`badge ${user.role === "ADMIN" ? "badge-green" : "badge-blue"}`}>
              {user.role}
            </span>
          </div>
        </header>
        <main className="p-4 sm:p-6 lg:p-8 flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}
