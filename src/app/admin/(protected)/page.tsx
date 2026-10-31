import Link from "next/link";
import { getAllPeriodsWithCounts, getMonthlySmsUsage, getLatestPeriodSummary } from "@/lib/data/admin";
import { periodLabel, formatTl } from "@/lib/data/panel";
import { badgeClass, cardClass, primaryButtonClass } from "@/lib/ui";

export default async function AdminDashboardPage() {
  const [periods, smsUsage, summary] = await Promise.all([
    getAllPeriodsWithCounts(),
    getMonthlySmsUsage(),
    getLatestPeriodSummary(),
  ]);

  return (
    <div className="flex flex-col gap-4">
      {summary && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className={cardClass}>
            <p className="text-xs text-muted">{summary.periodLabel} — Toplam Tahsil Edilecek</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-brand-navy">
              {formatTl(summary.toplamTahsilEdilecek)}
            </p>
          </div>
          <div className={cardClass}>
            <p className="text-xs text-muted">Gecikmedeki Kalem Sayısı</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-brand-red">
              {summary.gecikmedekiDaireSayisi}
            </p>
          </div>
          <div className={cardClass}>
            <p className="text-xs text-muted">Gecikme Tutarları Toplamı</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-brand-red">
              {formatTl(summary.gecikmeTutariToplami)}
            </p>
          </div>
          <div className={cardClass}>
            <p className="text-xs text-muted">Bu Ay Gönderilen SMS</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
              {smsUsage.used} / {smsUsage.limit}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Dönemler</h2>
        <Link href="/admin/donemler/yeni" className={primaryButtonClass}>
          Yeni Dönem Yükle
        </Link>
      </div>

      {periods.length === 0 ? (
        <p className={`${cardClass} text-sm text-muted`}>Henüz hiç dönem yüklenmedi.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <table className="w-full border-separate border-spacing-x-4 text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="border-b border-border py-3 pl-4">Dönem</th>
                <th className="border-b border-border">Durum</th>
                <th className="border-b border-border">Aidat</th>
                <th className="border-b border-border">Demirbaş</th>
                <th className="border-b border-border">Sıcak Su</th>
                <th className="border-b border-border pr-4">Yayın Tarihi</th>
              </tr>
            </thead>
            <tbody>
              {periods.map((p) => (
                <tr key={p.id}>
                  <td className="border-b border-border py-3 pl-4 font-medium text-foreground">
                    <Link href={`/admin/donemler/${p.id}`} className="text-brand-navy hover:underline">
                      {periodLabel(p)}
                    </Link>
                  </td>
                  <td className="border-b border-border">
                    <span className={badgeClass(p.status === "published" ? "green" : "gray")}>
                      {p.status === "published" ? "Yayınlandı" : "Taslak"}
                    </span>
                  </td>
                  <td className="border-b border-border tabular-nums text-foreground">{p.aidatCount} / 72</td>
                  <td className="border-b border-border tabular-nums text-foreground">{p.demirbasCount} / 72</td>
                  <td className="border-b border-border tabular-nums text-foreground">{p.sicakSuCount} / 72</td>
                  <td className="border-b border-border pr-4 text-muted">
                    {p.published_at ? new Date(p.published_at).toLocaleDateString("tr-TR") : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
