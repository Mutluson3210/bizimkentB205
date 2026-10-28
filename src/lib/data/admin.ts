import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

/** blockCode+unitNo -> unit_id eşlemesi. Excel satırlarını daireye bağlamak için. */
export async function buildUnitLookup(): Promise<Map<string, string>> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("units")
    .select("id, unit_no, blocks(code)");
  if (error) throw error;

  const map = new Map<string, string>();
  for (const row of data ?? []) {
    const blockCode = (row.blocks as unknown as { code: string } | null)?.code;
    if (!blockCode) continue;
    map.set(`${blockCode.toUpperCase()}|${row.unit_no}`, row.id);
  }
  return map;
}

export function unitLookupKey(blockCode: string, unitNo: number): string {
  return `${blockCode.toUpperCase()}|${unitNo}`;
}

export async function getAllPeriodsWithCounts() {
  const supabase = createServiceClient();
  const { data: periods, error } = await supabase
    .from("periods")
    .select("id, year, month, label, revision, status, published_at, created_at")
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .order("revision", { ascending: false });
  if (error) throw error;

  const results = [];
  for (const p of periods ?? []) {
    const [{ count: aidatCount }, { count: demirbasCount }, { count: sicakSuCount }] =
      await Promise.all([
        supabase.from("aidat_kayit").select("*", { count: "exact", head: true }).eq("period_id", p.id),
        supabase.from("demirbas_kayit").select("*", { count: "exact", head: true }).eq("period_id", p.id),
        supabase.from("sicak_su_kayit").select("*", { count: "exact", head: true }).eq("period_id", p.id),
      ]);
    results.push({ ...p, aidatCount: aidatCount ?? 0, demirbasCount: demirbasCount ?? 0, sicakSuCount: sicakSuCount ?? 0 });
  }
  return results;
}

export async function getUnitsWithAccounts() {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("units")
    .select("id, daire_no, unit_no, blocks(code, name), accounts(id, role, full_name, phone, is_active, synthetic_email)")
    .order("daire_no");
  if (error) throw error;
  return data ?? [];
}
