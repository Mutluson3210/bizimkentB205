"use client";

import { secondaryButtonClass } from "@/lib/ui";

export function PrintButton() {
  return (
    <button type="button" onClick={() => window.print()} className={`${secondaryButtonClass} print:hidden`}>
      Yazdır
    </button>
  );
}
