import Link from "next/link";
import { getAllPeriodsWithCounts, getMonthlySmsUsage } from "@/lib/data/admin";
import { periodLabel } from "@/lib/data/panel";
import { badgeClass, cardClass, primaryButtonClass } from "@/lib/ui";

export default async function AdminDashboardPage() {
  const [periods, smsUsage] = await Promise.all([getAllPeriodsWithCounts(), getMonthlySmsUsage()]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">Dönemler</h2>
          <span className={badgeClass(smsUsage.used >= smsUsage.limit ? "red" : "navy")}>
            Bu ay SMS: {smsUsage.used} / {smsUsage.limit}
          </span>
        </div>
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
