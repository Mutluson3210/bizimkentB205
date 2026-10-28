"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function GirisPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-4">
      <div className="text-center">
        <h1 className="text-xl font-semibold">Bizimkent B205</h1>
        <p className="mt-1 text-sm text-gray-500">Daire bilgilerinizle giriş yapın</p>
      </div>

      <form action={formAction} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Daire No
          <input
            name="daireNo"
            placeholder="örn. B2.05A-13"
            required
            className="rounded border px-3 py-2"
          />
        </label>

        <fieldset className="flex flex-col gap-1 text-sm">
          <legend>Rolünüz</legend>
          <label className="flex items-center gap-2">
            <input type="radio" name="role" value="owner" defaultChecked required />
            Ev Sahibi
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="role" value="tenant" required />
            Kiracı
          </label>
        </fieldset>

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
