"use client";

import { useActionState } from "react";
import { Logo } from "@/components/Logo";
import { cardClass, errorBoxClass, inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function GirisPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <Logo size={44} subtitle="Sakin Girişi" />

      <form action={formAction} className={`flex w-full max-w-sm flex-col gap-4 ${cardClass}`}>
        <label className={labelClass}>
          Daire No
          <input name="daireNo" placeholder="örn. B2.05A-13" required className={inputClass} />
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
      </form>
    </main>
  );
}
