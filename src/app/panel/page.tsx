import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount, getPublishedPeriods, getPeriodFigures, periodLabel } from "@/lib/data/panel";
import { AidatCard, DemirbasCard, SicakSuCard } from "@/components/FigureCards";

export default async function PanelPage() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) return null;

  const periods = await getPublishedPeriods(supabase);
  const latest = periods[0];

  if (!latest) {
    return <p className="text-sm text-gray-500">Henüz yayınlanmış bir dönem bulunmuyor.</p>;
  }

  const figures = await getPeriodFigures(supabase, latest.id, account.unit_id);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-gray-500">{periodLabel(latest)}</p>
      <AidatCard aidat={figures.aidat} />
      {account.role === "owner" && <DemirbasCard demirbas={figures.demirbas} />}
      <SicakSuCard sicakSu={figures.sicakSu} />
    </div>
  );
}
