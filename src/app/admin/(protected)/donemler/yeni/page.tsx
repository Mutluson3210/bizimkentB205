"use client";

import { useActionState } from "react";
import { uploadPeriodAction, type UploadState } from "./actions";

const initialState: UploadState = {};
const now = new Date();

export default function YeniDonemPage() {
  const [state, formAction, pending] = useActionState(uploadPeriodAction, initialState);

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <h2 className="font-semibold">Yeni Dönem Yükle</h2>
      <p className="text-sm text-gray-500">
        Yöneticinin hazırladığı Aidat+Demirbaş Excel dosyalarını (blok başına bir dosya, birden
        fazla seçebilirsiniz) ve isterseniz Sıcak Su dosyasını yükleyin. Aynı ay tekrar
        yüklenirse eski veri silinmez, otomatik olarak &quot;Düzeltme&quot; revizyonu oluşturulur.
      </p>

      <form action={formAction} className="flex flex-col gap-4">
        <div className="flex gap-3">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Yıl
            <input
              name="year"
              type="number"
              defaultValue={now.getFullYear()}
              required
              className="rounded border px-3 py-2"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Ay
            <select name="month" defaultValue={now.getMonth() + 1} required className="rounded border px-3 py-2">
              {["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"].map(
                (ay, i) => (
                  <option key={ay} value={i + 1}>
                    {ay}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          Aidat + Demirbaş Dosyaları (.xlsx)
          <input name="aidatFiles" type="file" accept=".xlsx,.xls" multiple className="rounded border px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Sıcak Su Dosyası (.xlsx, opsiyonel)
          <input name="sicakSuFile" type="file" accept=".xlsx,.xls" className="rounded border px-3 py-2" />
        </label>

        {state.error && (
          <p className="whitespace-pre-wrap rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {state.error}
          </p>
        )}

        {state.success && (
          <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <p className="font-medium">{state.success.periodLabel} yayınlandı.</p>
            <p>
              Aidat: {state.success.aidatCount} daire · Demirbaş: {state.success.demirbasCount} daire · Sıcak
              Su: {state.success.sicakSuCount} daire
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          className="rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Yükleniyor..." : "Yükle ve Yayınla"}
        </button>
      </form>
    </div>
  );
}
