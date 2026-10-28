"use client";

import { useActionState } from "react";
import { cardClass, errorBoxClass, inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { uploadPeriodAction, type UploadState } from "./actions";

const initialState: UploadState = {};
const now = new Date();
const AYLAR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

export default function YeniDonemPage() {
  const [state, formAction, pending] = useActionState(uploadPeriodAction, initialState);

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Yeni Dönem Yükle</h2>
        <p className="mt-1 text-sm text-muted">
          Yöneticinin hazırladığı Aidat+Demirbaş Excel dosyalarını (blok başına bir dosya, birden
          fazla seçebilirsiniz) ve isterseniz Sıcak Su dosyasını yükleyin. Aynı ay tekrar
          yüklenirse eski veri silinmez, otomatik olarak &quot;Düzeltme&quot; revizyonu oluşturulur.
        </p>
      </div>

      <form action={formAction} className={`flex flex-col gap-4 ${cardClass}`}>
        <div className="flex gap-3">
          <label className={`flex-1 ${labelClass}`}>
            Yıl
            <input name="year" type="number" defaultValue={now.getFullYear()} required className={inputClass} />
          </label>
          <label className={`flex-1 ${labelClass}`}>
            Ay
            <select name="month" defaultValue={now.getMonth() + 1} required className={inputClass}>
              {AYLAR.map((ay, i) => (
                <option key={ay} value={i + 1}>
                  {ay}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className={labelClass}>
          Aidat + Demirbaş Dosyaları (.xlsx)
          <input name="aidatFiles" type="file" accept=".xlsx,.xls" multiple className={inputClass} />
        </label>

        <label className={labelClass}>
          Sıcak Su Dosyası (.xlsx, opsiyonel)
          <input name="sicakSuFile" type="file" accept=".xlsx,.xls" className={inputClass} />
        </label>

        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm has-[:checked]:border-brand-navy has-[:checked]:bg-brand-navy-light">
          <input type="checkbox" name="notifySms" defaultChecked className="accent-brand-navy" />
          Yayınlandığında sakinlere SMS ile bildir
        </label>

        {state.error && <p className={errorBoxClass}>{state.error}</p>}

        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Yükleniyor..." : "Yükle ve Yayınla"}
        </button>
      </form>
    </div>
  );
}
