"use server";

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
