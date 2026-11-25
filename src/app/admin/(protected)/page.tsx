import Link from "next/link";
import { getAllPeriodsWithCounts, getMonthlySmsUsage, getLatestPeriodSummary, getSmsHealth } from "@/lib/data/admin";
import { periodLabel, formatTl } from "@/lib/data/panel";
import { badgeClass, cardClass, primaryButtonClass } from "@/lib/ui";

export default async function AdminDashboardPage() {
  const [periods, smsUsage, summary, smsHealth] = await Promise.all([
    getAllPeriodsWithCounts(),
    getMonthlySmsUsage(),
    getLatestPeriodSummary(),
    getSmsHealth(),
  ]);

  const smsSorunlu = smsHealth.relay !== "up" || smsHealth.recentFailures > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Aktarıcı sessizce düşebiliyor ve şifre sıfırlama akışı numara
          sızdırmamak için bilerek sessiz — arızayı yöneticinin görebileceği
          tek yer burası. Bu yüzden sayfanın en üstünde. */}
      {smsSorunlu && (
        <div className="rounded-xl border border-brand-red/20 bg-brand-red-light p-4">
          <p className="text-sm font-semibold text-brand-red">SMS gönderiminde sorun var</p>
          <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-brand-red">
            {smsHealth.relay === "down" && (
              <li>Aktarıcıya ulaşılamıyor{smsHealth.relayDetail ? `: ${smsHealth.relayDetail}` : ""}</li>
            )}
            {smsHealth.relay === "unconfigured" && (
              <li>Aktarıcı ayarlanmamış{smsHealth.relayDetail ? `: ${smsHealth.relayDetail}` : ""}</li>
            )}
            {smsHealth.recentFailures > 0 && smsHealth.lastFailure && (
              <li>
                Son başarılı gönderimden bu yana {smsHealth.recentFailures} başarısız deneme.
                Sonuncusu {new Date(smsHealth.lastFailure.at).toLocaleString("tr-TR")}:{" "}
                {smsHealth.lastFailure.message}
              </li>
            )}
          </ul>
          {smsHealth.relay === "down" && (
            <p className="mt-2 text-xs text-brand-red/80">
              Aktarıcı Oracle Cloud&apos;daki sunucuda çalışıyor. Makine boşta kaldığı için durdurulmuş
              olabilir; Oracle konsolundan başlatmak yeterli, aktarıcı ve sertifika servisi kendiliğinden
              açılıyor.
            </p>
          )}
        </div>
      )}
      {summary && (
        <div className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-foreground">Aylık İstatistikler</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
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
              <p className="text-xs text-muted">Ödenmeyen Demirbaş Toplamı</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-brand-red">
                {formatTl(summary.odenmeyenDemirbasToplami)}
              </p>
            </div>
            <div className={cardClass}>
              <p className="text-xs text-muted">Bu Ay Gönderilen SMS</p>
              <p className="mt-1 text-xl font-bold tabular-nums text-foreground">
                {smsUsage.used} / {smsUsage.limit}
              </p>
              {/* Sorun yokken de görünür: göstergenin kendisi çalışıyor mu,
                  yönetici bunu bilsin. */}
              <p
                className={`mt-1 text-xs ${smsHealth.relay === "up" ? "text-brand-green" : "text-brand-red"}`}
              >
                {smsHealth.relay === "up" ? "● Servis çalışıyor" : "● Servise ulaşılamıyor"}
              </p>
            </div>
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
