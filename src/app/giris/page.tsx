import { SiteSeal } from "@/components/Logo";
import { getPublicUnitDirectory } from "@/lib/data/public";
import { GirisForm } from "./GirisForm";

// Blok/daire listesi service-role ile (cookie'siz) çekildiği için Next bunu
// statik sanabilir; roster güncellendiğinde liste bayatlamasın diye zorla.
export const dynamic = "force-dynamic";

export default async function GirisPage() {
  const units = await getPublicUnitDirectory();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 px-4 py-12">
      <SiteSeal size={120} subtitle="Sakin Girişi" />
      <GirisForm units={units} />
    </main>
  );
}
