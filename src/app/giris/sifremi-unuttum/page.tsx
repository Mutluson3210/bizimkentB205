"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import { cardClass, errorBoxClass, inputClass, labelClass, linkClass, primaryButtonClass, successBoxClass } from "@/lib/ui";
import { requestResetAction, confirmResetAction, type RequestState, type ConfirmState } from "./actions";

const requestInitial: RequestState = {};
const confirmInitial: ConfirmState = {};

export default function SifremiUnuttumPage() {
  const [daireNo, setDaireNo] = useState("");
  const [role, setRole] = useState<"owner" | "tenant">("owner");
  const [requestState, requestAction, requestPending] = useActionState(requestResetAction, requestInitial);
  const [confirmState, confirmAction, confirmPending] = useActionState(confirmResetAction, confirmInitial);

  const codeSent = requestState.sent && !confirmState.success;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <Logo size={44} subtitle="Şifremi Unuttum" />

      {confirmState.success ? (
        <div className={`flex w-full max-w-sm flex-col gap-3 ${cardClass}`}>
          <p className={successBoxClass}>Şifreniz güncellendi. Artık yeni şifrenizle giriş yapabilirsiniz.</p>
          <Link href="/giris" className={primaryButtonClass}>
            Giriş sayfasına dön
          </Link>
        </div>
      ) : !codeSent ? (
        <form action={requestAction} className={`flex w-full max-w-sm flex-col gap-4 ${cardClass}`}>
          <p className="text-sm text-muted">
            Daire no ve rolünüzü girin, kayıtlı telefonunuza bir doğrulama kodu gönderelim.
          </p>

          <label className={labelClass}>
            Daire No
            <input
              name="daireNo"
              placeholder="örn. B2.05A-13"
              required
              value={daireNo}
              onChange={(e) => setDaireNo(e.target.value)}
              className={inputClass}
            />
          </label>

          <fieldset className="flex flex-col gap-2 text-sm">
            <legend className="mb-0.5 font-medium text-foreground">Rolünüz</legend>
            <div className="flex gap-2">
              <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm has-[:checked]:border-brand-navy has-[:checked]:bg-brand-navy-light has-[:checked]:text-brand-navy">
                <input
                  type="radio"
                  name="role"
                  value="owner"
                  checked={role === "owner"}
                  onChange={() => setRole("owner")}
                  className="accent-brand-navy"
                />
                Ev Sahibi
              </label>
              <label className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-sm has-[:checked]:border-brand-navy has-[:checked]:bg-brand-navy-light has-[:checked]:text-brand-navy">
                <input
                  type="radio"
                  name="role"
                  value="tenant"
                  checked={role === "tenant"}
                  onChange={() => setRole("tenant")}
                  className="accent-brand-navy"
                />
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
      ) : (
        <form action={confirmAction} className={`flex w-full max-w-sm flex-col gap-4 ${cardClass}`}>
          <p className={successBoxClass}>
            Telefonunuza bir doğrulama kodu gönderildiyse birazdan ulaşacaktır.
          </p>

          <input type="hidden" name="daireNo" value={daireNo} />
          <input type="hidden" name="role" value={role} />

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
      )}
    </main>
  );
}
