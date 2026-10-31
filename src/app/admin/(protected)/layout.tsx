import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { Footer } from "@/components/Footer";
import { navLinkClass } from "@/lib/ui";
import { adminLogoutAction } from "./actions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!isAdminEmail(user?.email)) {
    redirect("/admin/giris");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Logo size={34} subtitle="Yönetim" />
          <nav className="flex flex-wrap items-center gap-1">
            <Link href="/admin" className={navLinkClass}>
              Dönemler
            </Link>
            <Link href="/admin/donemler/yeni" className={navLinkClass}>
              Yeni Dönem Yükle
            </Link>
            <Link href="/admin/sakinler" className={navLinkClass}>
              Sakinler
            </Link>
            <Link href="/admin/duyurular" className={navLinkClass}>
              Duyurular
            </Link>
            <Link href="/admin/belgeler" className={navLinkClass}>
              Belgeler
            </Link>
            <Link href="/admin/sifre-degistir" className={navLinkClass}>
              Şifre Değiştir
            </Link>
            <form action={adminLogoutAction}>
              <button type="submit" className={navLinkClass}>
                Çıkış
              </button>
            </form>
          </nav>
        </div>
      </header>
      <div className="mx-auto max-w-4xl px-4 py-6">
        {children}
        <Footer />
      </div>
    </div>
  );
}
