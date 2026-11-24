import type { Metadata } from "next";
import { SiteSeal } from "@/components/Logo";
import { cardClass, primaryButtonClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Çevrimdışı — Bizimkent B205",
};

/** Service worker, internet yokken sayfa açılamadığında bunu gösterir.
 * Kişisel veri içermez; kurulumda peşin önbelleğe alınır. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <SiteSeal size={110} />
      <div className={`${cardClass} max-w-sm text-center`}>
        <h1 className="text-lg font-semibold text-foreground">İnternet bağlantısı yok</h1>
        <p className="mt-2 text-sm text-muted">
          Aidat ve duyuru bilgileri her açılışta sunucudan güncel olarak alınır,
          bu yüzden çevrimdışıyken gösterilemiyor. Bağlantı geldiğinde tekrar deneyin.
        </p>
        {/* Link değil <a>: service worker devredeyken tam sayfa yenileme istiyoruz. */}
        <a href="/panel" className={`${primaryButtonClass} mt-5`}>
          Tekrar Dene
        </a>
      </div>
    </main>
  );
}
