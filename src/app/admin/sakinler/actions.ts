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
