import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { db } from "@/lib/db";
import { currentUser } from "@/lib/session";
import { StkPay } from "./StkPay";

export const metadata: Metadata = { title: "Payment", robots: { index: false } };

export default async function PayPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const user = await currentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/checkout/pay/${code}`)}`);

  const order = await db.order.findFirst({
    where: { code, userId: user.id },
    include: { items: true },
  });
  if (!order) notFound();
  if (order.status !== "PENDING_PAYMENT") redirect(`/orders/${order.code}`);

  return (
    <StkPay
      order={{
        code: order.code,
        total: order.total,
        items: order.items.map((i) => ({ name: i.productName, qty: i.qty, lineTotal: i.lineTotal })),
      }}
      defaultPhone={order.customerPhone}
    />
  );
}
