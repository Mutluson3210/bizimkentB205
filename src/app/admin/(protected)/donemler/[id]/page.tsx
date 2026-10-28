import { notFound } from "next/navigation";
import { getPeriodDetail, getMonthlySmsUsage } from "@/lib/data/admin";
import { periodLabel } from "@/lib/data/panel";
import { badgeClass } from "@/lib/ui";
import { PeriodDetailClient } from "./PeriodDetailClient";

export default async function DonemDetayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ autosend?: string }>;
}) {
  const { id } = await params;
  const { autosend } = await searchParams;

  const detail = await getPeriodDetail(id);
  if (!detail) notFound();

  const usage = await getMonthlySmsUsage();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">{periodLabel(detail.period)}</h2>
          <p className="text-sm text-muted">
            {detail.period.status === "published" ? "Yayınlandı" : "Taslak"}
          </p>
        </div>
        <span className={badgeClass(usage.used >= usage.limit ? "red" : "navy")}>
          Bu ay SMS: {usage.used} / {usage.limit}
        </span>
      </div>

      <PeriodDetailClient periodId={id} units={detail.units} autosend={autosend === "1"} />
    </div>
  );
}
