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

      <table className="w-full border-separate border-spacing-x-3 text-sm">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="border-b py-2">Daire</th>
            <th className="border-b">Hesap</th>
            <th className="border-b">Ad Soyad</th>
            <th className="border-b">Telefon</th>
            <th className="border-b">Durum</th>
            <th className="border-b"></th>
          </tr>
        </thead>
        <tbody>
          {units.map((unit) => {
            const accounts = (unit.accounts as unknown as AccountRow[]) ?? [];
            if (accounts.length === 0) {
              return (
                <tr key={unit.id}>
                  <td className="border-b py-2">{unit.daire_no}</td>
                  <td colSpan={5} className="border-b text-gray-400">Henüz hesap yok</td>
                </tr>
              );
            }
            return accounts.map((acc, i) => (
              <tr key={acc.id}>
                {i === 0 && (
                  <td className="border-b py-2" rowSpan={accounts.length}>
                    {unit.daire_no}
                  </td>
                )}
                <td className="border-b">{acc.role === "owner" ? "Ev Sahibi" : "Kiracı"}</td>
                <td className="border-b">{acc.full_name}</td>
                <td className="border-b">{acc.phone ?? "-"}</td>
                <td className="border-b">{acc.is_active ? "Aktif" : "Pasif"}</td>
                <td className="border-b">
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
