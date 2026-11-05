"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getCurrentAccount } from "@/lib/data/panel";
import { getUnreadCounts, isNotifySection, type NotifySection } from "@/lib/data/notifications";

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/giris");
}

/** Bölümü "görüldü" olarak işaretler. Yazma, projedeki diğer yazmalar gibi
 * servis rolüyle yapılır (account_views'da sakine insert/update politikası
 * bilerek yok); hangi hesaba yazılacağı istemciden DEĞİL oturumdan gelir. */
export async function markSectionSeenAction(section: NotifySection) {
  if (!isNotifySection(section)) return;

  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) return;

  // Okunmamış bir şey yoksa ne yazılır ne revalidate edilir. Bu, action'ın
  // sayfa açılışında koşulsuz çağrılmasını güvenli kılar: ikinci çağrı
  // buradan sessizce döner, revalidate -> render -> çağrı döngüsü kurulmaz.
  const unread = await getUnreadCounts(supabase, account.id);
  if (unread[section] === 0) return;

  const service = createServiceClient();
  await service
    .from("account_views")
    .upsert(
      { account_id: account.id, section, seen_at: new Date().toISOString() },
      { onConflict: "account_id,section" },
    );

  revalidatePath("/panel", "layout");
}
