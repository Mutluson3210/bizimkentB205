"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";

export async function toggleAccountActiveAction(accountId: string, nextActive: boolean) {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("accounts")
    .update({ is_active: nextActive })
    .eq("id", accountId);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/sakinler");
}

export type UpdateAccountState = { success?: boolean; error?: string };

export async function updateAccountAction(
  accountId: string,
  _prevState: UpdateAccountState,
  formData: FormData,
): Promise<UpdateAccountState> {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!fullName) return { error: "Ad Soyad boş olamaz." };

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("accounts")
    .update({ full_name: fullName, phone: phone || null })
    .eq("id", accountId);
  if (error) return { error: error.message };

  revalidatePath("/admin/sakinler");
  return { success: true };
}

/**
 * Hesabın şifresini kimseye gösterilmeyen rastgele bir değerle değiştirir —
 * yani mevcut şifreyi geçersiz kılar.
 *
 * Neden gerekli: hesaplar kişiye değil daire+role bağlı (giriş kimliği
 * `b205b34-tenant@...` biçiminde üretiliyor), bu yüzden daire el
 * değiştirdiğinde aynı hesap yeni sakine devrediliyor. Pasifleştirip yeniden
 * aktif etmek şifreyi sıfırlamadığı için eski sakinin bildiği şifre geçerli
 * kalıyordu.
 *
 * Yeni şifre hiçbir yere yazılmaz; yeni sakin "Şifremi unuttum" akışından
 * kendi şifresini belirler (kayıtlı telefonuna kod gelir).
 */
export async function resetAccountPasswordAction(accountId: string) {
  const supabase = createServiceClient();

  const { data: account } = await supabase
    .from("accounts")
    .select("auth_user_id")
    .eq("id", accountId)
    .maybeSingle();

  if (!account?.auth_user_id) {
    throw new Error("Bu hesabın giriş kullanıcısı yok, şifre sıfırlanamaz.");
  }

  const { error } = await supabase.auth.admin.updateUserById(account.auth_user_id, {
    password: randomBytes(24).toString("base64url"),
  });
  if (error) throw new Error(error.message);

  revalidatePath("/admin/sakinler");
}
