import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiUser } from "@/lib/session";
import { formatDateTime } from "@/lib/format";

function csvEscape(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: (string | number | null)[][]): string {
  return rows.map((row) => row.map(csvEscape).join(",")).join("\r\n");
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ type: string }> }
) {
  const user = await apiUser();
  if (!user || (user.role !== "STAFF" && user.role !== "ADMIN")) {
    return NextResponse.json({ ok: false, error: "Staff access required." }, { status: 403 });
  }

  const { type } = await params;

  let csv: string;
  if (type === "orders") {
    const orders = await db.order.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: true },
      take: 5000,
    });
    csv = toCsv([
      ["Code", "Date", "Customer", "Phone", "Status", "Fulfilment", "TopUpPhone", "RouterSimNumber", "Address", "Items", "Total (KES)", "TopupRef"],
      ...orders.map((o) => [
        o.code,
        formatDateTime(o.createdAt),
        o.customerName,
        o.customerPhone,
        o.status,
        o.fulfilment,
        o.topupPhone || "",
        o.routerNumber || "",
        o.address || "",
        o.items.map((i) => `${i.productName} x${i.qty}`).join("; "),
        o.total,
        o.topupRef || "",
      ]),
    ]);
  } else if (type === "revenue") {
    const orders = await db.order.findMany({
      where: { status: { in: ["PAID", "PROCESSING", "COMPLETED"] } },
      orderBy: { createdAt: "asc" },
      include: { payments: { where: { status: "SUCCESS" }, take: 1 } },
      take: 10000,
    });
    const byDay = new Map<string, { revenue: number; orders: number }>();
    for (const o of orders) {
      const day = o.createdAt.toISOString().slice(0, 10);
      const entry = byDay.get(day) || { revenue: 0, orders: 0 };
      entry.revenue += o.total;
      entry.orders += 1;
      byDay.set(day, entry);
    }
    csv = toCsv([
      ["Date", "Orders", "Revenue (KES)"],
      ...Array.from(byDay.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([day, v]) => [day, v.orders, v.revenue]),
    ]);
  } else {
    return NextResponse.json({ ok: false, error: "Unknown export." }, { status: 404 });
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="gcn-${type}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
