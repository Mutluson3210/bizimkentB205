"use client";

import { useActionState } from "react";
import Link from "next/link";
import { cardClass, errorBoxClass, inputClass, labelClass, linkClass, primaryButtonClass, successBoxClass } from "@/lib/ui";
import type { PublicUnit } from "@/lib/data/public";
import { UnitSelect } from "@/components/UnitSelect";
import { requestResetAction, confirmResetAction, type RequestState, type ConfirmState } from "./actions";

const requestInitial: RequestState = {};
const confirmInitial: ConfirmState = {};

export function SifremiUnuttumForm({ units }: { units: PublicUnit[] }) {
  const [requestState, requestAction, requestPending] = useActionState(requestResetAction, requestInitial);
  const [confirmState, confirmAction, confirmPending] = useActionState(confirmResetAction, confirmInitial);

  const codeSent = requestState.sent && !confirmState.success;

  if (confirmState.success) {
    return (
      <div className={`flex w-full max-w-sm flex-col gap-3 ${cardClass}`}>
        <p className={successBoxClass}>Şifreniz güncellendi. Artık yeni şifrenizle giriş yapabilirsiniz.</p>
        <Link href="/giris" className={primaryButtonClass}>
          Giriş sayfasına dön
        </Link>
      </div>
    );
  }

  if (!codeSent) {
    return (
      <form action={requestAction} className={`flex w-full max-w-sm flex-col gap-4 ${cardClass}`}>
        <p className="text-sm text-muted">
          Blok, daire ve rolünüzü seçin; kayıtlı telefonunuza bir doğrulama kodu gönderelim.
        </p>

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

        {requestState.error && <p className={errorBoxClass}>{requestState.error}</p>}

        <button type="submit" disabled={requestPending} className={primaryButtonClass}>
          {requestPending ? "Gönderiliyor..." : "Kod Gönder"}
        </button>

        <Link href="/giris" className={`${linkClass} text-center`}>
          Giriş sayfasına dön
        </Link>
      </form>
    );
  }

  return (
    <form action={confirmAction} className={`flex w-full max-w-sm flex-col gap-4 ${cardClass}`}>
      <p className={successBoxClass}>
        {requestState.daireNo} ({requestState.role === "owner" ? "Ev Sahibi" : "Kiracı"}) için kayıtlı
        telefona doğrulama kodu gönderildiyse birazdan ulaşacaktır.
      </p>

      {/* Daire ve rol sunucunun döndürdüğü değerlerden taşınıyor. */}
      <input type="hidden" name="daireNo" value={requestState.daireNo ?? ""} />
      <input type="hidden" name="role" value={requestState.role ?? ""} />

      <label className={labelClass}>
        Doğrulama Kodu
        <input name="code" inputMode="numeric" maxLength={6} required className={inputClass} />
      </label>

      <label className={labelClass}>
        Yeni Şifre
        <input name="newPassword" type="password" required minLength={6} className={inputClass} />
      </label>

      {confirmState.error && <p className={errorBoxClass}>{confirmState.error}</p>}

      <button type="submit" disabled={confirmPending} className={primaryButtonClass}>
        {confirmPending ? "Kaydediliyor..." : "Şifreyi Güncelle"}
      </button>
    </form>
  );
}
