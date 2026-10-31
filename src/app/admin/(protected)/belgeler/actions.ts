"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";

export type UploadDocumentState = { error?: string };

export async function uploadDocumentAction(
  _prevState: UploadDocumentState,
  formData: FormData,
): Promise<UploadDocumentState> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bir dosya seçin." };
  }

  const supabase = createServiceClient();
  const { error } = await supabase.storage.from("belgeler").upload(file.name, file, {
    upsert: true,
  });
  if (error) {
    return { error: `Yükleme başarısız: ${error.message}` };
  }

  revalidatePath("/admin/belgeler");
  return {};
}

export async function deleteDocumentAction(name: string) {
  const supabase = createServiceClient();
  await supabase.storage.from("belgeler").remove([name]);
  revalidatePath("/admin/belgeler");
}
