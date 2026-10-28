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
    return <p className="text-sm text-muted">Henüz yayınlanmış bir dönem bulunmuyor.</p>;
  }

  const figures = await getPeriodFigures(supabase, latest.id, account.unit_id);

  const firstName = account.full_name.trim().split(/\s+/)[0];

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold text-foreground">
        Hoş geldiniz{firstName ? `, ${firstName}` : ""}
      </h1>
      <p className="text-sm font-medium text-brand-navy">{periodLabel(latest)}</p>
      <AidatCard aidat={figures.aidat} />
      {account.role === "owner" && <DemirbasCard demirbas={figures.demirbas} />}
      <SicakSuCard sicakSu={figures.sicakSu} />
    </div>
  );
}
