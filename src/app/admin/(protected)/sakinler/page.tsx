import Link from "next/link";
import { getUnitsWithAccounts } from "@/lib/data/admin";
import { toggleAccountActiveAction } from "./actions";
import { badgeClass, primaryButtonClass } from "@/lib/ui";

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
        <h2 className="text-lg font-semibold text-foreground">Sakinler</h2>
        <Link href="/admin/sakinler/roster-yukle" className={primaryButtonClass}>
          Sakin Listesi Yükle
        </Link>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <table className="w-full border-separate border-spacing-x-4 text-sm">
          <thead>
            <tr className="text-left text-muted">
              <th className="border-b border-border py-3 pl-4">Daire</th>
              <th className="border-b border-border">Hesap</th>
              <th className="border-b border-border">Ad Soyad</th>
              <th className="border-b border-border">Telefon</th>
              <th className="border-b border-border">Durum</th>
              <th className="border-b border-border pr-4"></th>
            </tr>
          </thead>
          <tbody>
            {units.map((unit) => {
              const accounts = (unit.accounts as unknown as AccountRow[]) ?? [];
              if (accounts.length === 0) {
                return (
                  <tr key={unit.id}>
                    <td className="border-b border-border py-3 pl-4 font-medium text-foreground">{unit.daire_no}</td>
                    <td colSpan={5} className="border-b border-border pr-4 text-muted">
                      Henüz hesap yok
                    </td>
                  </tr>
                );
              }
              return accounts.map((acc, i) => (
                <tr key={acc.id}>
                  {i === 0 && (
                    <td className="border-b border-border py-3 pl-4 font-medium text-foreground" rowSpan={accounts.length}>
                      {unit.daire_no}
                    </td>
                  )}
                  <td className="border-b border-border text-foreground">{acc.role === "owner" ? "Ev Sahibi" : "Kiracı"}</td>
                  <td className="border-b border-border text-foreground">{acc.full_name}</td>
                  <td className="border-b border-border text-muted">{acc.phone ?? "-"}</td>
                  <td className="border-b border-border">
                    <span className={badgeClass(acc.is_active ? "green" : "gray")}>
                      {acc.is_active ? "Aktif" : "Pasif"}
                    </span>
                  </td>
                  <td className="border-b border-border pr-4">
                    <form action={toggleAccountActiveAction.bind(null, acc.id, !acc.is_active)}>
                      <button type="submit" className="text-xs font-medium text-brand-navy hover:underline">
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
    </div>
  );
}
