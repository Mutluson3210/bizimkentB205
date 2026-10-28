import type { PeriodFigures } from "@/lib/data/panel";
import { formatTl } from "@/lib/data/panel";

function Row({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="flex items-center justify-between py-1.5 text-sm">
      <span className="text-gray-600">{label}</span>
      <span className="font-medium tabular-nums">{formatTl(value)}</span>
    </div>
  );
}

export function AidatCard({ aidat }: { aidat: PeriodFigures["aidat"] }) {
  if (!aidat) {
    return (
      <Card title="Aidat">
        <p className="text-sm text-gray-500">Bu dönem için henüz aidat verisi girilmedi.</p>
      </Card>
    );
  }

  return (
    <Card title="Aidat">
      <Row label="Önceki Aydan Devir" value={aidat.onceki_aydan_devir} />
      <Row label="Gecikme Tazminatı" value={aidat.gecikme_tazminati} />
      <Row label="Isınma / Doğalgaz" value={aidat.isinma_dogalgaz} />
      <Row label="Sıcak Su" value={aidat.sicak_su} />
      <Row label="Sabit Aidat" value={aidat.sabit_aidat} />
      <div className="mt-2 flex items-center justify-between border-t pt-2 text-base font-semibold">
        <span>Toplam</span>
        <span className="tabular-nums">{formatTl(aidat.toplam)}</span>
      </div>
    </Card>
  );
}

export function DemirbasCard({ demirbas }: { demirbas: PeriodFigures["demirbas"] }) {
  return (
    <Card title="Demirbaş" subtitle="Ev sahibine aittir">
      {!demirbas ? (
        <p className="text-sm text-gray-500">Bu dönem için henüz demirbaş verisi girilmedi.</p>
      ) : (
        <>
          <Row label="Önceki Aydan Devir" value={demirbas.onceki_aydan_devir} />
          <Row label="Gecikme Tazminatı" value={demirbas.gecikme_tazminati} />
          <div className="mt-2 flex items-center justify-between border-t pt-2 text-base font-semibold">
            <span>Toplam</span>
            <span className="tabular-nums">{formatTl(demirbas.toplam)}</span>
          </div>
        </>
      )}
    </Card>
  );
}

export function SicakSuCard({ sicakSu }: { sicakSu: PeriodFigures["sicakSu"] }) {
  if (!sicakSu) return null;

  return (
    <Card title="Sıcak Su Detayı" subtitle="Aidat tablosundaki Sıcak Su kaleminin kaynağı">
      <div className="grid grid-cols-2 gap-y-1.5 text-sm">
        <span className="text-gray-600">Aybaşı Sayaç</span>
        <span className="text-right tabular-nums">{sicakSu.aybasi_sayac ?? "-"}</span>
        <span className="text-gray-600">Aysonu Sayaç</span>
        <span className="text-right tabular-nums">{sicakSu.aysonu_sayac ?? "-"}</span>
        <span className="text-gray-600">Kullanılan M3</span>
        <span className="text-right tabular-nums">{sicakSu.kullanilan_m3 ?? "-"}</span>
        <span className="text-gray-600">M3 Fiyatı</span>
        <span className="text-right tabular-nums">{formatTl(sicakSu.m3_fiyati)}</span>
      </div>
      <div className="mt-2 flex items-center justify-between border-t pt-2 text-base font-semibold">
        <span>Sıcak Su Payı</span>
        <span className="tabular-nums">{formatTl(sicakSu.sicak_su_payi_tl)}</span>
      </div>
    </Card>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border p-4">
      <h2 className="font-semibold">{title}</h2>
      {subtitle && <p className="mb-2 text-xs text-gray-500">{subtitle}</p>}
      <div className="mt-2">{children}</div>
    </section>
  );
}
