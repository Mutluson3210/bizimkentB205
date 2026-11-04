import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount, getPublishedPeriods, getPeriodFigures, getUnitHasActiveTenant, periodLabel } from "@/lib/data/panel";
import { AidatCard, DemirbasCard, GenelToplamCard, SicakSuCard } from "@/components/FigureCards";
import { PrintButton } from "@/components/PrintButton";
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
    return <p className="text-sm text-muted">Henüz yayınlanmış bir dönem bulunmuyor.</p>;
  }

  const { donem } = await searchParams;
  const selected = periods.find((p) => p.id === donem) ?? periods[0];
  const [figures, hasActiveTenant] = await Promise.all([
    getPeriodFigures(supabase, selected.id, account.unit_id),
    account.role === "owner" ? getUnitHasActiveTenant(supabase) : Promise.resolve(true),
  ]);
  const showGenelToplam = account.role === "owner" && !hasActiveTenant;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 print:hidden">
          <h2 className="text-sm font-medium text-muted">Dönem seçin</h2>
          <PeriodSelect
            selectedId={selected.id}
            options={periods.map((p) => ({ id: p.id, label: periodLabel(p) }))}
          />
        </div>
        <p className="hidden text-sm font-medium text-brand-navy print:block">{periodLabel(selected)}</p>
        <div className="flex items-center gap-2 print:hidden">
          <PrintButton />
        </div>
      </div>
      <AidatCard aidat={figures.aidat} />
      {account.role === "owner" && <DemirbasCard demirbas={figures.demirbas} />}
      {showGenelToplam && <GenelToplamCard aidat={figures.aidat} demirbas={figures.demirbas} />}
      <SicakSuCard sicakSu={figures.sicakSu} />
    </div>
  );
}
