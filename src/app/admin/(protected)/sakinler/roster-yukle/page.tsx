"use client";

import { useActionState } from "react";
import { cardClass, errorBoxClass, inputClass, primaryButtonClass, successBoxClass } from "@/lib/ui";
import { uploadRosterAction, type RosterUploadState } from "./actions";

const initialState: RosterUploadState = {};

export default function RosterYuklePage() {
  const [state, formAction, pending] = useActionState(uploadRosterAction, initialState);

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Sakin Listesi Yükle</h2>
        <p className="mt-1 text-sm text-muted">
          Sütunlar: Daire No, Ad Soyad, Telefon, Rol (Ev Sahibi / Kiracı). Mevcut hesaplar
          güncellenir, yeni olanlar için otomatik giriş hesabı oluşturulur ve geçici şifreler bir
          kerelik olarak aşağıda gösterilir — mutlaka not alıp ilgili kişiye iletin, bu şifreler
          tekrar gösterilmez.
        </p>
      </div>

      <form action={formAction} className={`flex flex-col gap-4 ${cardClass}`}>
        <input name="rosterFile" type="file" accept=".xlsx,.xls" required className={inputClass} />

        {state.error && <p className={errorBoxClass}>{state.error}</p>}

        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Yükleniyor..." : "Yükle"}
        </button>
      </form>

      {state.success && (
        <div className={`flex flex-col gap-3 ${successBoxClass}`}>
          <p>{state.success.updated} hesap güncellendi.</p>
          {state.success.skipped.length > 0 && (
            <p className="text-brand-red">
              Tanınmayan rol değeri nedeniyle atlanan satırlar: {state.success.skipped.join(", ")}
            </p>
          )}
          {state.success.created.length === 0 ? (
            <p>Yeni hesap oluşturulmadı.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-brand-green/20 bg-white">
              <table className="w-full border-separate border-spacing-x-3 text-left text-xs">
                <thead>
                  <tr>
                    <th className="py-2 pl-3">Daire</th>
                    <th>Rol</th>
                    <th>Giriş E-postası</th>
                    <th className="pr-3">Geçici Şifre</th>
                  </tr>
                </thead>
                <tbody>
                  {state.success.created.map((c) => (
                    <tr key={c.email} className="font-mono text-foreground">
                      <td className="pl-3">{c.daireNo}</td>
                      <td>{c.role === "owner" ? "Ev Sahibi" : "Kiracı"}</td>
                      <td>{c.email}</td>
                      <td className="pr-3">{c.password}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
