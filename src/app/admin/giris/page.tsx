"use client";

import { useActionState } from "react";
import { Logo } from "@/components/Logo";
import { cardClass, errorBoxClass, inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { adminLoginAction, type AdminLoginState } from "./actions";

const initialState: AdminLoginState = {};

export default function AdminGirisPage() {
  const [state, formAction, pending] = useActionState(adminLoginAction, initialState);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <Logo size={44} subtitle="Yönetim Girişi" />

      <form action={formAction} className={`flex w-full max-w-sm flex-col gap-4 ${cardClass}`}>
        <label className={labelClass}>
          E-posta
          <input name="email" type="email" required className={inputClass} />
        </label>

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
