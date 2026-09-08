import {
  Package,
  Smartphone,
  Wifi,
  Phone,
  MessageSquare,
  Zap,
  Battery,
  Headphones,
  Watch,
  Gift,
  CreditCard,
  Signal,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  package: Package,
  smartphone: Smartphone,
  wifi: Wifi,
  phone: Phone,
  message: MessageSquare,
  zap: Zap,
  battery: Battery,
  headphones: Headphones,
  watch: Watch,
  gift: Gift,
  sim: CreditCard,
  signal: Signal,
};

export function CategoryIcon({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  const Icon = ICONS[name] || Package;
  return <Icon className={className} aria-hidden="true" />;
}
