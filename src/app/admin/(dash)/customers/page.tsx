import Link from "next/link";
import { Search } from "lucide-react";
import { db } from "@/lib/db";
import { requireStaff } from "@/lib/session";
import { formatKES, prettyPhone } from "@/lib/format";

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireStaff();
  const { q } = await searchParams;
  const search = (q || "").trim();

  const customers = await db.user.findMany({
    where: {
      role: "CUSTOMER",
      ...(search
        ? {
            OR: [
              { name: { contains: search } },
              { phone: { contains: search.replace(/\D/g, "") } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: {
      _count: { select: { orders: true } },
      orders: {
        where: { status: { in: ["PAID", "PROCESSING", "COMPLETED"] } },
        select: { total: true },
      },
    },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Customers</h1>
          <p className="text-ink-soft text-sm mt-0.5">Registered accounts and their lifetime value.</p>
        </div>
        <form action="/admin/customers" method="GET" className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-mute" />
            <input name="q" defaultValue={search} className="input pl-9 w-60" placeholder="Search name or phone…" />
          </div>
          <button className="btn btn-md btn-primary">Search</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead className="bg-paper">
              <tr>
                <th className="th">Customer</th>
                <th className="th">Joined</th>
                <th className="th text-center">Orders</th>
                <th className="th text-right">Lifetime value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="td text-center py-10 text-ink-mute">No customers found.</td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-brand-50/40">
                    <td className="td">
                      <Link href={`/admin/customers/${c.id}`} className="font-bold text-ink hover:text-brand-700">
                        {c.name}
                      </Link>
                      <div className="text-[12px] text-ink-mute">{prettyPhone(c.phone)}</div>
                    </td>
                    <td className="td text-[13px]">
                      {new Date(c.createdAt).toLocaleDateString("en-KE", { day: "numeric", month: "short", year: "numeric" })}
                    </td>
                    <td className="td text-center font-semibold">{c._count.orders}</td>
                    <td className="td text-right font-extrabold text-ink">
                      {formatKES(c.orders.reduce((n, o) => n + o.total, 0))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
