import "server-only";
import { createServiceClient } from "@/lib/supabase/service";
import { sendSms, normalizePhone } from "./verimor";
import { buildDebtMessage } from "./messages";
import { periodLabel } from "@/lib/data/panel";

const CONCURRENCY = 6;

export type SendDebtSmsSummary = {
  attempted: number;
  sent: number;
  failed: number;
};

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      results[idx] = await fn(items[idx]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Verilen periodId için, verilen accountId'lere borç bildirim SMS'i gönderir.
 * Hem otomatik (yayınlandığında) hem manuel (dönem detayında seçerek) gönderim
 * AYNI bu fonksiyondan geçer. Hesap başına ayrı HTTP çağrısı (toplu çağrı tek
 * kampanya id'si döndürdüğü için hesap başına doğru/yanlış loglanamaz).
 */
export async function sendDebtSms(periodId: string, accountIds: string[]): Promise<SendDebtSmsSummary> {
  const supabase = createServiceClient();

  const { data: period } = await supabase
    .from("periods")
    .select("label, revision")
    .eq("id", periodId)
    .single();
  if (!period) return { attempted: 0, sent: 0, failed: 0 };

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, role, phone, unit_id")
    .in("id", accountIds)
    .eq("is_active", true)
    .not("phone", "is", null);

  const targets = accounts ?? [];
  if (targets.length === 0) return { attempted: 0, sent: 0, failed: 0 };

  const unitIds = Array.from(new Set(targets.map((a) => a.unit_id)));
  const [{ data: units }, { data: aidatRows }, { data: demirbasRows }] = await Promise.all([
    supabase.from("units").select("id, daire_no").in("id", unitIds),
    supabase.from("aidat_kayit").select("*").eq("period_id", periodId).in("unit_id", unitIds),
    supabase.from("demirbas_kayit").select("*").eq("period_id", periodId).in("unit_id", unitIds),
  ]);

  const daireByUnit = new Map((units ?? []).map((u) => [u.id, u.daire_no]));
  const aidatByUnit = new Map((aidatRows ?? []).map((r) => [r.unit_id, r]));
  const demirbasByUnit = new Map((demirbasRows ?? []).map((r) => [r.unit_id, r]));

  let sent = 0;
  let failed = 0;

  await mapWithConcurrency(targets, CONCURRENCY, async (account) => {
    const daireNo = daireByUnit.get(account.unit_id) ?? "?";
    const message = buildDebtMessage({
      daireNo,
      periodLabel: periodLabel(period),
      role: account.role as "owner" | "tenant",
      aidat: aidatByUnit.get(account.unit_id) ?? null,
      demirbas: demirbasByUnit.get(account.unit_id) ?? null,
    });

    const result = await sendSms(account.phone!, message);
    if (result.ok) sent += 1;
    else failed += 1;

    await supabase.from("sms_log").insert({
      kind: "debt_notice",
      period_id: periodId,
      account_id: account.id,
      phone: normalizePhone(account.phone!),
      message,
      status: result.ok ? "sent" : "failed",
      provider_response: result.raw,
    });
  });

  return { attempted: targets.length, sent, failed };
}
