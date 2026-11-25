import { Logo } from "@/components/Logo";
import { getPublicUnitDirectory } from "@/lib/data/public";
import { SifremiUnuttumForm } from "./SifremiUnuttumForm";

// Blok/daire listesi service-role ile (cookie'siz) çekildiği için Next bunu
// statik sanabilir; roster güncellendiğinde liste bayatlamasın diye zorla.
// (Giriş sayfasıyla aynı gerekçe.)
export const dynamic = "force-dynamic";

export default async function SifremiUnuttumPage() {
  const units = await getPublicUnitDirectory();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <Logo size={44} subtitle="Şifremi Unuttum" />
      <SifremiUnuttumForm units={units} />
    </main>
  );
}
