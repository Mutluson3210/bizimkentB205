import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount, getPublishedPeriods, getPeriodFigures, getUnitHasActiveTenant, periodLabel } from "@/lib/data/panel";
import { AidatCard, DemirbasCard, GenelToplamCard, SicakSuCard } from "@/components/FigureCards";
import { PrintButton } from "@/components/PrintButton";

export default async function PanelPage() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) return null;

  const periods = await getPublishedPeriods(supabase);
  const latest = periods[0];

  if (!latest) {
    return <p className="text-sm text-muted">Henüz yayınlanmış bir dönem bulunmuyor.</p>;
  }

  const [figures, hasActiveTenant] = await Promise.all([
    getPeriodFigures(supabase, latest.id, account.unit_id),
    account.role === "owner" ? getUnitHasActiveTenant(supabase) : Promise.resolve(true),
  ]);

  const firstName = account.full_name.trim().split(/\s+/)[0];
  const showGenelToplam = account.role === "owner" && !hasActiveTenant;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold text-foreground">
        Hoş geldiniz{firstName ? `, ${firstName}` : ""}
      </h1>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-brand-navy">{periodLabel(latest)}</p>
        <PrintButton />
      </div>
      <AidatCard aidat={figures.aidat} />
      {account.role === "owner" && <DemirbasCard demirbas={figures.demirbas} />}
      {showGenelToplam && <GenelToplamCard aidat={figures.aidat} demirbas={figures.demirbas} />}
      <SicakSuCard sicakSu={figures.sicakSu} />
    </div>
  );
}
