import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount, getPublishedPeriods, getPeriodFigures, periodLabel } from "@/lib/data/panel";
import { AidatCard, DemirbasCard, SicakSuCard } from "@/components/FigureCards";
import { PeriodSelect } from "./PeriodSelect";

export default async function GecmisPage({
  searchParams,
}: {
  searchParams: Promise<{ donem?: string }>;
}) {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) return null;

  const periods = await getPublishedPeriods(supabase);
  if (periods.length === 0) {
    return <p className="text-sm text-gray-500">Henüz yayınlanmış bir dönem bulunmuyor.</p>;
  }

  const { donem } = await searchParams;
  const selected = periods.find((p) => p.id === donem) ?? periods[0];
  const figures = await getPeriodFigures(supabase, selected.id, account.unit_id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-500">Dönem seçin</h2>
        <PeriodSelect
          selectedId={selected.id}
          options={periods.map((p) => ({ id: p.id, label: periodLabel(p) }))}
        />
      </div>
      <AidatCard aidat={figures.aidat} />
      {account.role === "owner" && <DemirbasCard demirbas={figures.demirbas} />}
      <SicakSuCard sicakSu={figures.sicakSu} />
    </div>
  );
}
