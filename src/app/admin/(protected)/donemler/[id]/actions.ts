"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { deletePeriod } from "@/lib/data/admin";
import { sendDebtSms, type SendDebtSmsSummary } from "@/lib/sms/sendDebtSms";

export type SendState = {
  result?: SendDebtSmsSummary;
  skippedReason?: "already_sent" | "no_eligible_accounts";
  error?: string;
};

export async function sendDebtSmsAction(
  _prevState: SendState,
  formData: FormData,
): Promise<SendState> {
  const periodId = String(formData.get("periodId") ?? "");
  const accountIds = formData.getAll("accountIds").map(String);

  if (!periodId || accountIds.length === 0) {
    return { error: "Gönderilecek en az bir hesap seçin." };
  }

  const result = await sendDebtSms(periodId, accountIds);
  revalidatePath(`/admin/donemler/${periodId}`);
  return { result };
}

/**
 * Yeni dönem yayınlandığında otomatik tetiklenir. Bu dönem için daha önce hiç
 * borç bildirimi SMS'i gönderilmediyse (idempotency guard — sayfa ?autosend=1
 * ile yenilenirse ikinci kez göndermesin diye) tüm aktif+telefonlu hesaplara
 * gönderir; aksi halde hiçbir şey yapmaz.
 */
export async function autoSendIfNeededAction(periodId: string): Promise<SendState> {
  const supabase = createServiceClient();

  const { count: alreadySent } = await supabase
    .from("sms_log")
    .select("*", { count: "exact", head: true })
    .eq("period_id", periodId)
    .eq("kind", "debt_notice");
  if ((alreadySent ?? 0) > 0) {
    return { skippedReason: "already_sent" };
  }

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id")
    .eq("is_active", true)
    .not("phone", "is", null);

  const accountIds = (accounts ?? []).map((a) => a.id);
  if (accountIds.length === 0) return { skippedReason: "no_eligible_accounts" };

  const result = await sendDebtSms(periodId, accountIds);
  revalidatePath(`/admin/donemler/${periodId}`);
  return { result };
}

/**
 * Dönemi ve ona bağlı tüm aidat/demirbaş/sıcak su kayıtlarını siler
 * (DB'de ON DELETE CASCADE ile). Yanlış yüklenen bir dönemi topluca
 * geri almak için — sms_log geçmişi period_id null'lanarak korunur.
 */
export async function deletePeriodAction(periodId: string) {
  await deletePeriod(periodId);
  revalidatePath("/admin");
  redirect("/admin");
}
