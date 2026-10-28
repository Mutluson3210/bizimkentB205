import Link from "next/link";
import { getAllPeriodsWithCounts } from "@/lib/data/admin";
import { periodLabel } from "@/lib/data/panel";

export default async function AdminDashboardPage() {
  const periods = await getAllPeriodsWithCounts();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Dönemler</h2>
        <Link
          href="/admin/donemler/yeni"
          className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white"
        >
          Yeni Dönem Yükle
        </Link>
      </div>

      {periods.length === 0 ? (
        <p className="text-sm text-gray-500">Henüz hiç dönem yüklenmedi.</p>
      ) : (
        <table className="w-full border-separate border-spacing-x-3 text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="border-b py-2">Dönem</th>
              <th className="border-b">Durum</th>
              <th className="border-b">Aidat</th>
              <th className="border-b">Demirbaş</th>
              <th className="border-b">Sıcak Su</th>
              <th className="border-b">Yayın Tarihi</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.id}>
                <td className="border-b py-2">{periodLabel(p)}</td>
                <td className="border-b">{p.status === "published" ? "Yayınlandı" : "Taslak"}</td>
                <td className="border-b tabular-nums">{p.aidatCount} / 72</td>
                <td className="border-b tabular-nums">{p.demirbasCount} / 72</td>
                <td className="border-b tabular-nums">{p.sicakSuCount} / 72</td>
                <td className="border-b">{p.published_at ? new Date(p.published_at).toLocaleDateString("tr-TR") : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
