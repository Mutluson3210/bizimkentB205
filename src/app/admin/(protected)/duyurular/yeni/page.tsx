"use client";

import { useActionState } from "react";
import { cardClass, errorBoxClass, inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { createAnnouncementAction, type CreateAnnouncementState } from "../actions";

const initialState: CreateAnnouncementState = {};

export default function YeniDuyuruPage() {
  const [state, formAction, pending] = useActionState(createAnnouncementAction, initialState);

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Yeni Duyuru</h2>

      <form action={formAction} className={`flex flex-col gap-4 ${cardClass}`}>
        <label className={labelClass}>
          Başlık
          <input name="title" required className={inputClass} />
        </label>

        <label className={labelClass}>
          İçerik
          <textarea name="body" required rows={6} className={inputClass} />
        </label>

        <label className={labelClass}>
          Görsel veya Dosya Eki (opsiyonel)
          <input name="attachment" type="file" className={inputClass} />
        </label>

        {state.error && <p className={errorBoxClass}>{state.error}</p>}

        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Yayınlanıyor..." : "Yayınla"}
        </button>
      </form>
    </div>
  );
}
