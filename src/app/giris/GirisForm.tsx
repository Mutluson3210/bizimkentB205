"use client";

import { useActionState } from "react";
import Link from "next/link";
import { cardClass, errorBoxClass, linkClass, primaryButtonClass } from "@/lib/ui";
import type { PublicUnit } from "@/lib/data/public";
import { UnitSelect } from "@/components/UnitSelect";
import { PasswordField } from "@/components/PasswordField";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export function GirisForm({ units }: { units: PublicUnit[] }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className={`flex w-full max-w-sm flex-col gap-4 ${cardClass}`}>
      <UnitSelect units={units} />

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

      <PasswordField />

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
