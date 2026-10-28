import type { PeriodFigures } from "@/lib/data/panel";
import { formatTl } from "@/lib/data/panel";
import { badgeClass, cardClass } from "@/lib/ui";

function Row({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="flex items-center justify-between py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="font-medium tabular-nums text-foreground">{formatTl(value)}</span>
    </div>
  );
}

function TotalRow({ value }: { value: number | null | undefined }) {
  const negative = (value ?? 0) < 0;
  return (
    <div className="mt-1 flex items-center justify-between rounded-lg bg-brand-navy-light px-3 py-2.5 text-base font-semibold">
      <span className="text-brand-navy">Toplam</span>
      <span className={`tabular-nums ${negative ? "text-brand-green" : "text-brand-navy"}`}>
        {formatTl(value)}
      </span>
    </div>
  );
}

export function AidatCard({ aidat }: { aidat: PeriodFigures["aidat"] }) {
  return (
    <Card title="Aidat" badge={{ tone: "navy", text: "Kiracı ve ev sahibi görür" }}>
      {!aidat ? (
        <EmptyNote />
      ) : (
        <>
          <Row label="Önceki Aydan Devir" value={aidat.onceki_aydan_devir} />
          <Row label="Gecikme Tazminatı" value={aidat.gecikme_tazminati} />
          <Row label="Isınma / Doğalgaz" value={aidat.isinma_dogalgaz} />
          <Row label="Sıcak Su" value={aidat.sicak_su} />
          <Row label="Sabit Aidat" value={aidat.sabit_aidat} />
          <TotalRow value={aidat.toplam} />
        </>
      )}
    </Card>
  );
}

export function DemirbasCard({ demirbas }: { demirbas: PeriodFigures["demirbas"] }) {
  return (
    <Card title="Demirbaş" badge={{ tone: "green", text: "Ev sahibine aittir" }}>
      {!demirbas ? (
        <EmptyNote />
      ) : (
        <>
          <Row label="Önceki Aydan Devir" value={demirbas.onceki_aydan_devir} />
          <Row label="Gecikme Tazminatı" value={demirbas.gecikme_tazminati} />
          <TotalRow value={demirbas.toplam} />
        </>
      )}
    </Card>
  );
}

export function SicakSuCard({ sicakSu }: { sicakSu: PeriodFigures["sicakSu"] }) {
  if (!sicakSu) return null;

  return (
    <Card title="Sıcak Su Detayı" subtitle="Aidat tablosundaki Sıcak Su kaleminin kaynağı">
      <div className="grid grid-cols-2 gap-y-2 text-sm">
        <span className="text-muted">Aybaşı Sayaç</span>
        <span className="text-right tabular-nums text-foreground">{sicakSu.aybasi_sayac ?? "-"}</span>
        <span className="text-muted">Aysonu Sayaç</span>
        <span className="text-right tabular-nums text-foreground">{sicakSu.aysonu_sayac ?? "-"}</span>
        <span className="text-muted">Kullanılan M3</span>
        <span className="text-right tabular-nums text-foreground">{sicakSu.kullanilan_m3 ?? "-"}</span>
        <span className="text-muted">M3 Fiyatı</span>
        <span className="text-right tabular-nums text-foreground">{formatTl(sicakSu.m3_fiyati)}</span>
      </div>
      <TotalRow value={sicakSu.sicak_su_payi_tl} />
    </Card>
  );
}

function EmptyNote() {
  return <p className="py-2 text-sm text-muted">Bu dönem için henüz veri girilmedi.</p>;
}

function Card({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle?: string;
  badge?: { tone: "navy" | "green" | "red" | "gray"; text: string };
  children: React.ReactNode;
}) {
  return (
    <section className={cardClass}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-foreground">{title}</h2>
        {badge && <span className={badgeClass(badge.tone)}>{badge.text}</span>}
      </div>
      {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      <div className="mt-2 divide-y divide-border">{children}</div>
    </section>
  );
}
