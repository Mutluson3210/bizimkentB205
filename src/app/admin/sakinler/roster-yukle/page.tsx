"use client";

import { useActionState } from "react";
import { uploadRosterAction, type RosterUploadState } from "./actions";

const initialState: RosterUploadState = {};

export default function RosterYuklePage() {
  const [state, formAction, pending] = useActionState(uploadRosterAction, initialState);

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <h2 className="font-semibold">Sakin Listesi Yükle</h2>
      <p className="text-sm text-gray-500">
        Sütunlar: Daire No, Ad Soyad, Telefon, Rol (Ev Sahibi / Kiracı). Mevcut hesaplar
        güncellenir, yeni olanlar için otomatik giriş hesabı oluşturulur ve geçici şifreler bir
        kerelik olarak aşağıda gösterilir — mutlaka not alıp ilgili kişiye iletin, bu şifreler
        tekrar gösterilmez.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <input name="rosterFile" type="file" accept=".xlsx,.xls" required className="rounded border px-3 py-2" />

        {state.error && (
          <p className="whitespace-pre-wrap rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Yükleniyor..." : "Yükle"}
        </button>
      </form>

      {state.success && (
        <div className="flex flex-col gap-3 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          <p>{state.success.updated} hesap güncellendi.</p>
          {state.success.skipped.length > 0 && (
            <p className="text-amber-700">
              Tanınmayan rol değeri nedeniyle atlanan satırlar: {state.success.skipped.join(", ")}
            </p>
          )}
          {state.success.created.length === 0 ? (
            <p>Yeni hesap oluşturulmadı.</p>
          ) : (
            <table className="w-full text-left text-xs">
              <thead>
                <tr>
                  <th>Daire</th>
                  <th>Rol</th>
                  <th>Giriş E-postası</th>
                  <th>Geçici Şifre</th>
                </tr>
              </thead>
              <tbody>
                {state.success.created.map((c) => (
                  <tr key={c.email} className="font-mono">
                    <td>{c.daireNo}</td>
                    <td>{c.role === "owner" ? "Ev Sahibi" : "Kiracı"}</td>
                    <td>{c.email}</td>
                    <td>{c.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
