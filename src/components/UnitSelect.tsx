"use client";

import { useMemo, useState } from "react";
import { inputClass, labelClass } from "@/lib/ui";
import type { PublicUnit } from "@/lib/data/public";

/**
 * Blok + Daire No açılır listeleri.
 *
 * Hem giriş hem şifre sıfırlama formunda kullanılır. Daire no'yu elle
 * yazdırmak yazım hatasına çok açıktı ("B2 05 A 13", "b205a13", "13"...) ve
 * şifre sıfırlama akışı hesap varlığını sızdırmamak için hatada BİLEREK
 * sessiz kaldığından (bkz. lib/sms/otp.ts), yanlış yazan sakin ne SMS ne de
 * hata mesajı alıyordu. Listeden seçmek bu sınıf hatayı ortadan kaldırıyor.
 *
 * Listeler BOŞ başlar ve seçim zorunludur. Önceden ilk blok/ilk daire hazır
 * seçili geliyordu ve bunun bedeli canlıda görüldü: listeye dokunmayan bir
 * sakin, farkında olmadan BAŞKASININ dairesi için şifre sıfırlama kodu
 * istedi. Kendisi (akış sessiz olduğu için) hiçbir şey alamadı, kod ise
 * ilgisiz bir sakinin telefonuna gitti. Hazır seçili varsayılan, sessiz bir
 * akışla birleşince yanlış hedefi görünmez kılıyor.
 */
export function UnitSelect({
  units,
  onDaireChange,
}: {
  units: PublicUnit[];
  /** Seçili daire React state'inde de gerekiyorsa (çok adımlı formlar). */
  onDaireChange?: (daireNo: string) => void;
}) {
  const blocks = useMemo(() => {
    const seen = new Map<string, string>();
    for (const u of units) {
      if (u.blockCode && !seen.has(u.blockCode)) seen.set(u.blockCode, u.blockName);
    }
    return Array.from(seen, ([code, name]) => ({ code, name }));
  }, [units]);

  const [blockCode, setBlockCode] = useState("");
  const unitsInBlock = useMemo(
    () => (blockCode ? units.filter((u) => u.blockCode === blockCode) : []),
    [units, blockCode],
  );
  const [daireNo, setDaireNo] = useState("");

  function selectDaire(value: string) {
    setDaireNo(value);
    onDaireChange?.(value);
  }

  // Blok değişince daire seçimi sıfırlanır: önceki bloktan kalan bir daire
  // numarasıyla gönderim yapılamasın.
  function handleBlockChange(code: string) {
    setBlockCode(code);
    selectDaire("");
  }

  return (
    <>
      <label className={labelClass}>
        Blok
        <select
          required
          value={blockCode}
          onChange={(e) => handleBlockChange(e.target.value)}
          className={inputClass}
        >
          <option value="" disabled>
            Blok seçin
          </option>
          {blocks.map((b) => (
            <option key={b.code} value={b.code}>
              {b.name}
            </option>
          ))}
        </select>
      </label>

      <label className={labelClass}>
        Daire No
        <select
          name="daireNo"
          required
          disabled={!blockCode}
          value={daireNo}
          onChange={(e) => selectDaire(e.target.value)}
          className={inputClass}
        >
          <option value="" disabled>
            {blockCode ? "Daire seçin" : "Önce blok seçin"}
          </option>
          {unitsInBlock.map((u) => (
            <option key={u.daireNo} value={u.daireNo}>
              {u.daireNo}
            </option>
          ))}
        </select>
      </label>
    </>
  );
}
