import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth";
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
    <div className="mx-auto min-h-screen max-w-4xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between border-b pb-4">
        <h1 className="text-lg font-semibold">Bizimkent B205 — Yönetim</h1>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/admin" className="text-gray-600 hover:underline">
            Dönemler
          </Link>
          <Link href="/admin/donemler/yeni" className="text-gray-600 hover:underline">
            Yeni Dönem Yükle
          </Link>
          <Link href="/admin/sakinler" className="text-gray-600 hover:underline">
            Sakinler
          </Link>
          <form action={adminLogoutAction}>
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
