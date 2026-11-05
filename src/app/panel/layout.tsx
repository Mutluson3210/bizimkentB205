import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/data/panel";
import { getUnreadCounts } from "@/lib/data/notifications";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { navBadgeClass, navLinkClass } from "@/lib/ui";
import { logoutAction } from "./actions";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);

  if (!account) {
    redirect("/giris");
  }

  const roleLabel = account.role === "owner" ? "Ev Sahibi" : "Kiracı";
  const unread = await getUnreadCounts(supabase, account.id);

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card print:hidden">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-4">
          <Logo size={34} />
          <nav className="flex flex-wrap items-center gap-1">
            <NavLink href="/panel" label="Güncel Ay" count={unread.periods} />
            <Link href="/panel/gecmis" className={navLinkClass}>
              Geçmiş Aylar
            </Link>
            <NavLink href="/panel/duyurular" label="Duyurular" count={unread.announcements} />
            <NavLink href="/panel/belgeler" label="Belgeler" count={unread.documents} />
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
        <Footer />
      </div>
    </div>
  );
}

/** Yeni içerik varsa bağlantı yazısının yanında sayıyı gösterir; yoksa
 * bağlantı sade görünür. 9'dan fazlası "9+" olarak kısaltılır (menüyü
 * kaydırmasın). */
function NavLink({ href, label, count }: { href: string; label: string; count: number }) {
  return (
    <Link href={href} className={`${navLinkClass} inline-flex items-center gap-1`}>
      {label}
      {count > 0 && (
        <span className={navBadgeClass} aria-label={`${count} yeni`}>
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}
