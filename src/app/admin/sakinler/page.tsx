import Link from "next/link";
import { getUnitsWithAccounts } from "@/lib/data/admin";
import { toggleAccountActiveAction } from "./actions";

type AccountRow = {
  id: string;
  role: string;
  full_name: string;
  phone: string | null;
  is_active: boolean;
  synthetic_email: string;
};

export default async function SakinlerPage() {
  const units = await getUnitsWithAccounts();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Sakinler</h2>
        <Link href="/admin/sakinler/roster-yukle" className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white">
          Sakin Listesi Yükle
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="py-2">Daire</th>
            <th>Hesap</th>
            <th>Ad Soyad</th>
            <th>Telefon</th>
            <th>Durum</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => {
            const accounts = (unit.accounts as unknown as AccountRow[]) ?? [];
            if (accounts.length === 0) {
              return (
                <tr key={unit.id} className="border-b">
                  <td className="py-2">{unit.daire_no}</td>
                  <td colSpan={4} className="text-gray-400">Henüz hesap yok</td>
                </tr>
              );
            }
            return accounts.map((acc, i) => (
              <tr key={acc.id} className="border-b">
                {i === 0 && (
                  <td className="py-2" rowSpan={accounts.length}>
                    {unit.daire_no}
                  </td>
                )}
                <td>{acc.role === "owner" ? "Ev Sahibi" : "Kiracı"}</td>
                <td>{acc.full_name}</td>
                <td>{acc.phone ?? "-"}</td>
                <td>{acc.is_active ? "Aktif" : "Pasif"}</td>
                <td>
                  <form action={toggleAccountActiveAction.bind(null, acc.id, !acc.is_active)}>
                    <button type="submit" className="text-xs text-gray-600 hover:underline">
                      {acc.is_active ? "Pasifleştir" : "Aktifleştir"}
                    </button>
                  </form>
                </td>
              </tr>
            ));
          })}
        </tbody>
      </table>
    </div>
  );
}
