"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentAccount } from "@/lib/data/panel";

export type PushActionResult = { ok: true } | { ok: false; error: string };

export type PushSubscriptionInput = {
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string;
};

/** Cihazı bildirim listesine ekler.
 *
 * markSectionSeenAction ile aynı desen: yazma servis rolüyle yapılır ve
 * hangi hesaba yazılacağı istemciden DEĞİL oturumdan gelir. Aynı cihaz
 * (endpoint) yeniden abone olursa kayıt üzerine yazılır — böylece sakin
 * cihazı başkasına devrederse bildirimler yeni sahibine gider. */
export async function savePushSubscriptionAction(
  input: PushSubscriptionInput,
): Promise<PushActionResult> {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) return { ok: false, error: "Oturum bulunamadı." };

  if (!input?.endpoint || !input.p256dh || !input.auth) {
    return { ok: false, error: "Abonelik bilgisi eksik." };
  }

  const service = createServiceClient();
  const { error } = await service.from("push_subscriptions").upsert(
    {
      account_id: account.id,
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth_secret: input.auth,
      user_agent: input.userAgent?.slice(0, 300) ?? null,
    },
    { onConflict: "endpoint" },
  );

  if (error) return { ok: false, error: "Bildirim kaydı yapılamadı." };
  return { ok: true };
}

/** Cihazı listeden çıkarır. Silme yalnızca kendi hesabının kaydıyla
 * sınırlı — istemci başkasının endpoint'ini göndererek onun bildirimlerini
 * kapatamaz. */
export async function removePushSubscriptionAction(
  endpoint: string,
): Promise<PushActionResult> {
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) return { ok: false, error: "Oturum bulunamadı." };
  if (!endpoint) return { ok: false, error: "Abonelik bilgisi eksik." };

  const service = createServiceClient();
  const { error } = await service
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("account_id", account.id);

  if (error) return { ok: false, error: "Bildirim kaydı silinemedi." };
  return { ok: true };
}
