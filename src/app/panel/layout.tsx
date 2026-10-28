import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/data/panel";
import { Logo } from "@/components/Logo";
import { navLinkClass } from "@/lib/ui";
import { logoutAction } from "./actions";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);

  if (!account) {
    redirect("/giris");
  }

  const roleLabel = account.role === "owner" ? "Ev Sahibi" : "Kiracı";

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Logo size={34} />
          <nav className="flex items-center gap-5">
            <Link href="/panel" className={navLinkClass}>
              Güncel Ay
            </Link>
            <Link href="/panel/gecmis" className={navLinkClass}>
              Geçmiş Aylar
            </Link>
            <Link href="/panel/sifre-degistir" className={navLinkClass}>
              Şifre Değiştir
            </Link>
            <form action={logoutAction}>
              <button type="submit" className={navLinkClass}>
                Çıkış
              </button>
            </form>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-2xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted">{account.block_name}</p>
            <h1 className="text-xl font-semibold text-foreground">{account.daire_no}</h1>
          </div>
          <span className="inline-flex items-center rounded-full bg-brand-navy-light px-3 py-1 text-sm font-medium text-brand-navy">
            {roleLabel}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
