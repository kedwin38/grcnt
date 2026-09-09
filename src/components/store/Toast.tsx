"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import { CheckCircle2, Info, ShoppingCart, X } from "lucide-react";

type ToastVariant = "success" | "info" | "cart";

type ToastInput = {
  title: string;
  description?: string;
  variant?: ToastVariant;
  actionHref?: string;
  actionLabel?: string;
};

type ToastItem = ToastInput & { id: number };

type ToastContextType = { show: (toast: ToastInput) => void };

const ToastContext = createContext<ToastContextType | null>(null);
const ICONS: Record<ToastVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  info: Info,
  cart: ShoppingCart,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (toast: ToastInput) => {
      const id = ++idRef.current;
      setToasts((prev) => [...prev.slice(-2), { ...toast, id }]);
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss]
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed z-[100] bottom-4 right-4 left-4 sm:left-auto sm:w-96 flex flex-col gap-2.5 pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.variant ?? "success"];
          return (
            <div
              key={t.id}
              className="pointer-events-auto card shadow-lift p-4 flex items-start gap-3 animate-toast-in"
            >
              <div className="w-9 h-9 shrink-0 rounded-full bg-brand-50 border border-brand-100 flex items-center justify-center">
                <Icon className="w-4.5 h-4.5 text-brand-600" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm text-ink">{t.title}</div>
                {t.description ? (
                  <div className="text-[13px] text-ink-mute mt-0.5">{t.description}</div>
                ) : null}
                {t.actionHref ? (
                  <Link
                    href={t.actionHref}
                    onClick={() => dismiss(t.id)}
                    className="inline-block mt-1.5 text-[13px] font-bold text-brand-700 hover:underline"
                  >
                    {t.actionLabel ?? "View"} &rarr;
                  </Link>
                ) : null}
              </div>
              <button
                onClick={() => dismiss(t.id)}
                className="text-ink-mute hover:text-ink shrink-0"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
}
