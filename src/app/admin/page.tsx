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
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">Dönem</th>
              <th>Durum</th>
              <th>Aidat</th>
              <th>Demirbaş</th>
              <th>Sıcak Su</th>
              <th>Yayın Tarihi</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.id} className="border-b">
                <td className="py-2">{periodLabel(p)}</td>
                <td>{p.status === "published" ? "Yayınlandı" : "Taslak"}</td>
                <td className="tabular-nums">{p.aidatCount} / 72</td>
                <td className="tabular-nums">{p.demirbasCount} / 72</td>
                <td className="tabular-nums">{p.sicakSuCount} / 72</td>
                <td>{p.published_at ? new Date(p.published_at).toLocaleDateString("tr-TR") : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
