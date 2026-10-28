"use client";

import { useRouter } from "next/navigation";

type Option = { id: string; label: string };

export function PeriodSelect({ options, selectedId }: { options: Option[]; selectedId: string }) {
  const router = useRouter();

  return (
    <select
      className="rounded border px-3 py-2 text-sm"
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
