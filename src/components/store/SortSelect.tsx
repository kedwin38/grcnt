"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function SortSelect({ options }: { options: { value: string; label: string }[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function onChange(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === options[0].value) {
      params.delete("sort");
    } else {
      params.set("sort", value);
    }
    router.push(`/shop?${params.toString()}`);
  }

  return (
    <select
      id="sort"
      className="input h-9 text-[13px] w-auto pr-8"
      defaultValue={searchParams.get("sort") || options[0].value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Sort products"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
