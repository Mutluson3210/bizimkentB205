"use client";

import { useRouter } from "next/navigation";

type Option = { id: string; label: string };

export function PeriodSelect({ options, selectedId }: { options: Option[]; selectedId: string }) {
  const router = useRouter();

  return (
    <select
      // Mobilde 16px: altındaki boyutlarda iOS Safari sayfayı yakınlaştırıyor (bkz. lib/ui.ts inputClass).
      className="rounded-lg border border-border bg-white px-3 py-2 text-base font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-brand-navy/25 focus:border-brand-navy sm:text-sm"
      value={selectedId}
      onChange={(e) => router.push(`/panel/gecmis?donem=${e.target.value}`)}
    >
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
