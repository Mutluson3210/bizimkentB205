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

function startOfMonthIso(): string {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export async function getMonthlySmsUsage(limit = 500): Promise<{ used: number; limit: number }> {
  const supabase = createServiceClient();
  const { count } = await supabase
    .from("sms_log")
    .select("*", { count: "exact", head: true })
    .eq("status", "sent")
    .gte("created_at", startOfMonthIso());
  return { used: count ?? 0, limit };
}

export type PeriodDetailAccount = {
  accountId: string;
  role: "owner" | "tenant";
  fullName: string;
  phone: string | null;
  isActive: boolean;
  lastSmsAt: string | null;
  lastSmsStatus: string | null;
};

export type PeriodDetailUnit = {
  unitId: string;
  daireNo: string;
  aidatToplam: number | null;
  demirbasToplam: number | null;
  accounts: PeriodDetailAccount[];
};

export async function getPeriodDetail(periodId: string) {
  const supabase = createServiceClient();

  const { data: period } = await supabase
    .from("periods")
    .select("id, year, month, label, revision, status, published_at")
    .eq("id", periodId)
    .single();
  if (!period) return null;

  const [{ data: units }, { data: aidatRows }, { data: demirbasRows }, { data: smsRows }] = await Promise.all([
    supabase
      .from("units")
      .select("id, daire_no, accounts(id, role, full_name, phone, is_active)")
      .order("daire_no"),
    supabase.from("aidat_kayit").select("unit_id, toplam").eq("period_id", periodId),
    supabase.from("demirbas_kayit").select("unit_id, toplam").eq("period_id", periodId),
    supabase
      .from("sms_log")
      .select("account_id, status, created_at")
      .eq("period_id", periodId)
      .eq("kind", "debt_notice")
      .order("created_at", { ascending: false }),
  ]);

  const aidatByUnit = new Map((aidatRows ?? []).map((r) => [r.unit_id, r.toplam]));
  const demirbasByUnit = new Map((demirbasRows ?? []).map((r) => [r.unit_id, r.toplam]));
  const lastSmsByAccount = new Map<string, { status: string; created_at: string }>();
  for (const row of smsRows ?? []) {
    if (!lastSmsByAccount.has(row.account_id)) {
      lastSmsByAccount.set(row.account_id, { status: row.status, created_at: row.created_at });
    }
  }

  const detailUnits: PeriodDetailUnit[] = (units ?? []).map((u) => {
    type AccRow = { id: string; role: string; full_name: string; phone: string | null; is_active: boolean };
    const accounts = (u.accounts as unknown as AccRow[]) ?? [];
    return {
      unitId: u.id,
      daireNo: u.daire_no,
      aidatToplam: aidatByUnit.get(u.id) ?? null,
      demirbasToplam: demirbasByUnit.get(u.id) ?? null,
      accounts: accounts.map((a) => {
        const lastSms = lastSmsByAccount.get(a.id);
        return {
          accountId: a.id,
          role: a.role as "owner" | "tenant",
          fullName: a.full_name,
          phone: a.phone,
          isActive: a.is_active,
          lastSmsAt: lastSms?.created_at ?? null,
          lastSmsStatus: lastSms?.status ?? null,
        };
      }),
    };
  });

  return { period, units: detailUnits };
}
