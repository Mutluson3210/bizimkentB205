"use client";

import { useActionState } from "react";
import { cardClass, errorBoxClass, inputClass, labelClass, primaryButtonClass, successBoxClass } from "@/lib/ui";
import { changePasswordAction, type ChangePasswordState } from "./actions";

const initialState: ChangePasswordState = {};

export default function AdminSifreDegistirPage() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);

  return (
    <div className="flex max-w-sm flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Şifre Değiştir</h2>

      <form action={formAction} className={`flex flex-col gap-4 ${cardClass}`}>
        <label className={labelClass}>
          Mevcut Şifre
          <input name="currentPassword" type="password" required className={inputClass} />
        </label>

        <label className={labelClass}>
          Yeni Şifre
          <input name="newPassword" type="password" required minLength={6} className={inputClass} />
        </label>

        <label className={labelClass}>
          Yeni Şifre (Tekrar)
          <input name="newPasswordAgain" type="password" required minLength={6} className={inputClass} />
        </label>

        {state.error && <p className={errorBoxClass}>{state.error}</p>}
        {state.success && <p className={successBoxClass}>Şifreniz güncellendi.</p>}

        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? "Kaydediliyor..." : "Şifreyi Güncelle"}
        </button>
      </form>
    </div>
  );
}
