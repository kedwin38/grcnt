// Formatting & Kenya-specific helpers.

/** Whole-shilling money: 1500 → "KSh 1,500" */
export function formatKES(amount: number): string {
  return `KSh ${new Intl.NumberFormat("en-KE").format(Math.round(amount))}`;
}

/** Normalize any Kenyan mobile input to 2547XXXXXXXX / 2541XXXXXXXX. Returns null when invalid. */
export function normalizePhone(input: string): string | null {
  let digits = (input || "").replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `254${digits.slice(1)}`;
  if (digits.startsWith("7") || digits.startsWith("1")) digits = `254${digits}`;
  if (digits.startsWith("254")) {
    const rest = digits.slice(3);
    if (/^(7|1)\d{8}$/.test(rest)) return `254${rest}`;
  }
  return null;
}

/** 254712345678 → 0712 345 678 */
export function prettyPhone(phone: string): string {
  if (/^254(7|1)\d{8}$/.test(phone)) {
    const local = `0${phone.slice(3)}`;
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  }
  return phone;
}

const DATE_TIME = new Intl.DateTimeFormat("en-KE", {
  timeZone: "Africa/Nairobi",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});

const DATE_ONLY = new Intl.DateTimeFormat("en-KE", {
  timeZone: "Africa/Nairobi",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function formatDateTime(d: Date | string): string {
  return DATE_TIME.format(new Date(d));
}

export function formatDate(d: Date | string): string {
  return DATE_ONLY.format(new Date(d));
}

export function timeAgo(d: Date | string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "item"
  );
}
