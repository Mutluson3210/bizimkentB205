"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/auth";

export type AdminLoginState = { error?: string };

export async function adminLoginAction(
  _prevState: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "E-posta ve şifre girin." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "E-posta veya şifre hatalı." };
  }

  if (!isAdminEmail(email)) {
    await supabase.auth.signOut();
    return { error: "Bu hesabın admin yetkisi yok." };
  }

  redirect("/admin");
}
