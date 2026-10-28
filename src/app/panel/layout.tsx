import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/data/panel";
import { logoutAction } from "./actions";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);

  if (!account) {
    redirect("/giris");
  }

  const roleLabel = account.role === "owner" ? "Ev Sahibi" : "Kiracı";

  return (
    <div className="mx-auto min-h-screen max-w-2xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between border-b pb-4">
        <div>
          <p className="text-sm text-gray-500">{account.block_name}</p>
          <h1 className="text-lg font-semibold">
            {account.daire_no} <span className="font-normal text-gray-500">· {roleLabel}</span>
          </h1>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/panel" className="text-gray-600 hover:underline">
            Güncel Ay
          </Link>
          <Link href="/panel/gecmis" className="text-gray-600 hover:underline">
            Geçmiş Aylar
          </Link>
          <form action={logoutAction}>
            <button type="submit" className="text-gray-600 hover:underline">
              Çıkış
            </button>
          </form>
        </nav>
      </header>
      {children}
    </div>
  );
}
