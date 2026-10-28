"use client";

import { useActionState } from "react";
import { adminLoginAction, type AdminLoginState } from "./actions";

const initialState: AdminLoginState = {};

export default function AdminGirisPage() {
  const [state, formAction, pending] = useActionState(adminLoginAction, initialState);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Bizimkent B205 — Yönetim</h1>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          E-posta
          <input name="email" type="email" required className="rounded border px-3 py-2" />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          Şifre
          <input
            name="password"
            type="password"
            required
            className="rounded border px-3 py-2"
          />
        </label>

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Giriş yapılıyor..." : "Giriş Yap"}
        </button>
      </form>
    </main>
  );
}
