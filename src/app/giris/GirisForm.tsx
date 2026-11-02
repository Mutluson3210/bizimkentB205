"use client";

import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { cardClass, errorBoxClass, inputClass, labelClass, linkClass, primaryButtonClass } from "@/lib/ui";
import type { PublicUnit } from "@/lib/data/public";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function GirisForm({ units }: { units: PublicUnit[] }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  const blocks = useMemo(() => {
    const seen = new Map<string, string>();
    for (const u of units) {
      if (u.blockCode && !seen.has(u.blockCode)) seen.set(u.blockCode, u.blockName);
    }
    return Array.from(seen, ([code, name]) => ({ code, name }));
  }, [units]);

  const [blockCode, setBlockCode] = useState(blocks[0]?.code ?? "");
  const unitsInBlock = useMemo(() => units.filter((u) => u.blockCode === blockCode), [units, blockCode]);
  const [daireNo, setDaireNo] = useState(unitsInBlock[0]?.daireNo ?? "");

  function handleBlockChange(code: string) {
    setBlockCode(code);
    const firstInBlock = units.find((u) => u.blockCode === code);
    setDaireNo(firstInBlock?.daireNo ?? "");
  }

  return (
    <form action={formAction} className={`flex w-full max-w-sm flex-col gap-4 ${cardClass}`}>
      <label className={labelClass}>
        Blok
        <select
          value={blockCode}
          onChange={(e) => handleBlockChange(e.target.value)}
          className={inputClass}
        >
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
          value={daireNo}
          onChange={(e) => setDaireNo(e.target.value)}
          className={inputClass}
        >
          {unitsInBlock.map((u) => (
            <option key={u.daireNo} value={u.daireNo}>
              {u.daireNo}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-2 text-sm">
        <legend className="mb-0.5 font-medium text-foreground">Rolünüz</legend>
        <div className="flex gap-2">
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm has-[:checked]:border-brand-navy has-[:checked]:bg-brand-navy-light has-[:checked]:text-brand-navy">
            <input type="radio" name="role" value="owner" defaultChecked required className="accent-brand-navy" />
            Ev Sahibi
          </label>
          <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm has-[:checked]:border-brand-navy has-[:checked]:bg-brand-navy-light has-[:checked]:text-brand-navy">
            <input type="radio" name="role" value="tenant" required className="accent-brand-navy" />
            Kiracı
          </label>
        </div>
      </fieldset>

      <label className={labelClass}>
        Şifre
        <input name="password" type="password" required className={inputClass} />
      </label>

      {state.error && <p className={errorBoxClass}>{state.error}</p>}

      <button type="submit" disabled={pending} className={`${primaryButtonClass} mt-1 w-full`}>
        {pending ? "Giriş yapılıyor..." : "Giriş Yap"}
      </button>

      <Link href="/giris/sifremi-unuttum" className={`${linkClass} text-center`}>
        Şifremi unuttum
      </Link>
    </form>
  );
}
