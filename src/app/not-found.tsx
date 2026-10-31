import Link from "next/link";
import { Logo } from "@/components/Logo";
import { linkClass, primaryButtonClass } from "@/lib/ui";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo size={44} />
      <div>
        <h1 className="text-2xl font-bold text-foreground">Sayfa bulunamadı</h1>
        <p className="mt-2 text-sm text-muted">Aradığınız sayfa taşınmış veya hiç var olmamış olabilir.</p>
      </div>
      <div className="flex gap-3">
        <Link href="/giris" className={primaryButtonClass}>
          Sakin Girişine Dön
        </Link>
        <Link href="/admin/giris" className={linkClass}>
          Yönetim Girişi
        </Link>
      </div>
    </main>
  );
}
