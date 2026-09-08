"use client";

import { useRouter } from "next/navigation";
import { Zap } from "lucide-react";

export function PayAgainButton({ code }: { code: string }) {
  const router = useRouter();
  return (
    <button className="btn btn-lg btn-primary" onClick={() => router.push(`/checkout/pay/${code}`)}>
      <Zap className="w-4.5 h-4.5" /> Pay with M-Pesa
    </button>
  );
}
