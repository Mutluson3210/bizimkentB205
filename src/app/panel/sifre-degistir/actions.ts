"use server";

import { createClient } from "@/lib/supabase/server";

export type ChangePasswordState = { success?: boolean; error?: string };

export async function changePasswordAction(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const newPasswordAgain = String(formData.get("newPasswordAgain") ?? "");

  if (!currentPassword || !newPassword || !newPasswordAgain) {
    return { error: "Tüm alanları doldurun." };
  }
  if (newPassword.length < 6) {
    return { error: "Yeni şifre en az 6 karakter olmalı." };
  }
  if (newPassword !== newPasswordAgain) {
    return { error: "Yeni şifreler birbiriyle uyuşmuyor." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return { error: "Oturum bulunamadı, lütfen tekrar giriş yapın." };
  }

  // Değişikliği uygulamadan önce mevcut şifreyi doğrula — açık kalan bir
  // oturumda, şifreyi bilmeyen birinin şifreyi değiştirememesi için.
  const { error: verifyError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) {
    return { error: "Mevcut şifre hatalı." };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    return { error: "Şifre güncellenemedi, lütfen tekrar deneyin." };
  }

  return { success: true };
}
