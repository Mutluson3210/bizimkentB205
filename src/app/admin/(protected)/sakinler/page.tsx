import Link from "next/link";
import { getUnitsWithAccounts } from "@/lib/data/admin";
import { primaryButtonClass } from "@/lib/ui";
import { SakinlerTable } from "./SakinlerTable";

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

      <SakinlerTable units={units} />
    </div>
  );
}
