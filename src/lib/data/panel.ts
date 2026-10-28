import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export type CurrentAccount = {
  id: string;
  role: "owner" | "tenant";
  full_name: string;
  unit_id: string;
  daire_no: string;
  block_name: string;
};

export async function getCurrentAccount(
  supabase: SupabaseServer,
): Promise<CurrentAccount | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("accounts")
    .select("id, role, full_name, unit_id, units(daire_no, blocks(name))")
    .eq("auth_user_id", user.id)
    .eq("is_active", true)
    .maybeSingle();

  if (error || !data || !data.units) return null;

  const unit = data.units as unknown as {
    daire_no: string;
    blocks: { name: string } | null;
  };

  return {
    id: data.id,
    role: data.role as "owner" | "tenant",
    full_name: data.full_name,
    unit_id: data.unit_id,
    daire_no: unit.daire_no,
    block_name: unit.blocks?.name ?? "",
  };
}

export async function getPublishedPeriods(supabase: SupabaseServer) {
  const { data } = await supabase
    .from("periods")
    .select("id, year, month, label, revision, status, published_at")
    .eq("status", "published")
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .order("revision", { ascending: false });

  return data ?? [];
}

export type PeriodFigures = {
  aidat: Tables<"aidat_kayit"> | null;
  demirbas: Tables<"demirbas_kayit"> | null;
  sicakSu: Tables<"sicak_su_kayit"> | null;
};

export async function getPeriodFigures(
  supabase: SupabaseServer,
  periodId: string,
  unitId: string,
): Promise<PeriodFigures> {
  const [{ data: aidat }, { data: demirbas }, { data: sicakSu }] = await Promise.all([
    supabase
      .from("aidat_kayit")
      .select("*")
      .eq("period_id", periodId)
      .eq("unit_id", unitId)
      .maybeSingle(),
    supabase
      .from("demirbas_kayit")
      .select("*")
      .eq("period_id", periodId)
      .eq("unit_id", unitId)
      .maybeSingle(),
    supabase
      .from("sicak_su_kayit")
      .select("*")
      .eq("period_id", periodId)
      .eq("unit_id", unitId)
      .maybeSingle(),
  ]);

  return { aidat: aidat ?? null, demirbas: demirbas ?? null, sicakSu: sicakSu ?? null };
}

export function formatTl(value: number | null | undefined): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(value ?? 0);
}

export function periodLabel(p: { label: string; revision: number }): string {
  return p.revision > 0 ? `${p.label} — Düzeltme ${p.revision}` : p.label;
}

/** Oturum açan kullanıcının kendi dairesinde aktif bir kiracı hesabı var mı?
 * (sadece bir boolean döner, başka hiçbir kişisel bilgi sızdırmaz — bkz.
 * `public.unit_has_active_tenant` SQL fonksiyonu.) Ev sahibi tek başına
 * oturuyorsa (kiracı yoksa) Aidat+Demirbaş genel toplamını göstermek için. */
export async function getUnitHasActiveTenant(supabase: SupabaseServer): Promise<boolean> {
  const { data } = await supabase.rpc("unit_has_active_tenant");
  return data ?? false;
}
