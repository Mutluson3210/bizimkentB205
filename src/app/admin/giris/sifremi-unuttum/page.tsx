"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { SiteSeal } from "@/components/Logo";
import { cardClass, errorBoxClass, inputClass, labelClass, linkClass, primaryButtonClass, successBoxClass } from "@/lib/ui";
import { requestResetAction, confirmResetAction, type RequestState, type ConfirmState } from "./actions";

const requestInitial: RequestState = {};
const confirmInitial: ConfirmState = {};

export default function AdminSifremiUnuttumPage() {
  const [email, setEmail] = useState("");
  const [requestState, requestAction, requestPending] = useActionState(requestResetAction, requestInitial);
  const [confirmState, confirmAction, confirmPending] = useActionState(confirmResetAction, confirmInitial);

  const codeSent = requestState.sent && !confirmState.success;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <SiteSeal size={100} subtitle="Yönetici Şifremi Unuttum" />

      {confirmState.success ? (
        <div className={`flex w-full max-w-sm flex-col gap-3 ${cardClass}`}>
          <p className={successBoxClass}>Şifreniz güncellendi. Artık yeni şifrenizle giriş yapabilirsiniz.</p>
          <Link href="/admin/giris" className={primaryButtonClass}>
            Giriş sayfasına dön
          </Link>
        </div>
      ) : !codeSent ? (
        <form action={requestAction} className={`flex w-full max-w-sm flex-col gap-4 ${cardClass}`}>
          <p className="text-sm text-muted">
            Yönetici e-posta adresinizi girin, kayıtlı telefona bir doğrulama kodu gönderelim.
          </p>

          <label className={labelClass}>
            E-posta
            <input
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </label>

          {requestState.error && <p className={errorBoxClass}>{requestState.error}</p>}

          <button type="submit" disabled={requestPending} className={primaryButtonClass}>
            {requestPending ? "Gönderiliyor..." : "Kod Gönder"}
          </button>

          <Link href="/admin/giris" className={`${linkClass} text-center`}>
            Giriş sayfasına dön
          </Link>
        </form>
      ) : (
        <form action={confirmAction} className={`flex w-full max-w-sm flex-col gap-4 ${cardClass}`}>
          <p className={successBoxClass}>
            Kayıtlı telefona bir doğrulama kodu gönderildiyse birazdan ulaşacaktır.
          </p>

          <input type="hidden" name="email" value={email} />

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
