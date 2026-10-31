import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount, getPublishedPeriods, getPeriodFigures, getUnitHasActiveTenant, periodLabel } from "@/lib/data/panel";
import { getAnnouncements } from "@/lib/data/announcements";
import { AidatCard, DemirbasCard, GenelToplamCard, SicakSuCard } from "@/components/FigureCards";
import { PrintButton } from "@/components/PrintButton";
import { cardClass, linkClass, secondaryButtonClass } from "@/lib/ui";

export default async function PanelPage() {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) return null;

  const periods = await getPublishedPeriods(supabase);
  const latest = periods[0];

  const [announcements, figures, hasActiveTenant] = await Promise.all([
    getAnnouncements(supabase),
    latest ? getPeriodFigures(supabase, latest.id, account.unit_id) : Promise.resolve(null),
    account.role === "owner" ? getUnitHasActiveTenant(supabase) : Promise.resolve(true),
  ]);
  const latestAnnouncement = announcements[0];

  const firstName = account.full_name.trim().split(/\s+/)[0];
  const showGenelToplam = account.role === "owner" && !hasActiveTenant;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold text-foreground">
        Hoş geldiniz{firstName ? `, ${firstName}` : ""}
      </h1>

      {latestAnnouncement && (
        <section className={`${cardClass} border-brand-navy/30 bg-brand-navy-light`}>
          <p className="text-xs font-medium uppercase tracking-wide text-brand-navy">Son Duyuru</p>
          <h3 className="mt-1 font-semibold text-foreground">{latestAnnouncement.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-foreground/80">{latestAnnouncement.body}</p>
          <Link href="/panel/duyurular" className={`mt-2 inline-block ${linkClass}`}>
            Tüm duyuruları gör →
          </Link>
        </section>
      )}

      {!latest || !figures ? (
        <p className="text-sm text-muted">Henüz yayınlanmış bir dönem bulunmuyor.</p>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-brand-navy">{periodLabel(latest)}</p>
            <div className="flex items-center gap-2 print:hidden">
              <a href={`/panel/makbuz/${latest.id}`} className={secondaryButtonClass}>
                Makbuz İndir (PDF)
              </a>
              <PrintButton />
            </div>
          </div>
          <AidatCard aidat={figures.aidat} />
          {account.role === "owner" && <DemirbasCard demirbas={figures.demirbas} />}
          {showGenelToplam && <GenelToplamCard aidat={figures.aidat} demirbas={figures.demirbas} />}
          <SicakSuCard sicakSu={figures.sicakSu} />
        </>
      )}
    </div>
  );
}
