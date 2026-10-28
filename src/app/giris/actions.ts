"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { syntheticEmail, type Role } from "@/lib/auth";

export type LoginState = { error?: string };

export async function loginAction(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const daireNo = String(formData.get("daireNo") ?? "").trim();
  const role = String(formData.get("role") ?? "") as Role;
  const password = String(formData.get("password") ?? "");

  if (!daireNo || (role !== "owner" && role !== "tenant") || !password) {
    return { error: "Lütfen daire no, rol ve şifreyi eksiksiz girin." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: syntheticEmail(daireNo, role),
    password,
  });

  if (error) {
    return { error: "Daire no, rol veya şifre hatalı." };
  }

  redirect("/panel");
}
