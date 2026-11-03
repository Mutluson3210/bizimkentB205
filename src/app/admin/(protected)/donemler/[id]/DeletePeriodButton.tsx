"use client";

import { useState } from "react";
import { deletePeriodAction } from "./actions";

export function DeletePeriodButton({ periodId, periodLabel }: { periodId: string; periodLabel: string }) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs font-medium text-brand-red hover:underline"
      >
        Dönemi Sil
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-brand-red/30 bg-brand-red-light px-3 py-2">
      <span className="text-xs text-brand-red">
        &quot;{periodLabel}&quot; dönemi ve tüm aidat/demirbaş/sıcak su kayıtları kalıcı olarak
        silinecek. Emin misiniz?
      </span>
      <form action={deletePeriodAction.bind(null, periodId)}>
        <button
          type="submit"
          className="rounded-md bg-brand-red px-2.5 py-1 text-xs font-medium text-white hover:opacity-90"
        >
          Evet, Sil
        </button>
      </form>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        className="text-xs font-medium text-muted hover:underline"
      >
        Vazgeç
      </button>
    </div>
  );
}
