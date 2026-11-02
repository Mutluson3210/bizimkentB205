"use server";

import { revalidatePath } from "next/cache";
import { createServiceClient } from "@/lib/supabase/service";
import { toStorageSafeFilename } from "@/lib/files";

export type CreateUploadUrlResult =
  | { ok: true; path: string; signedUrl: string; token: string }
  | { ok: false; error: string };

/**
 * Dosya baytları bu server action'dan GEÇMEZ — sadece imzalı bir yükleme
 * URL'si üretir; tarayıcı asıl dosyayı doğrudan Supabase Storage'a yükler.
 * Böylece Vercel'in serverless fonksiyonlardaki ~4.5MB istek gövdesi sınırına
 * takılmadan büyük PDF/dosyalar (örn. acil eylem planları) yüklenebilir.
 */
export async function createDocumentUploadUrlAction(filename: string): Promise<CreateUploadUrlResult> {
  if (!filename.trim()) {
    return { ok: false, error: "Geçersiz dosya adı." };
  }

  const supabase = createServiceClient();
  const safeFilename = toStorageSafeFilename(filename);
  const { data, error } = await supabase.storage.from("belgeler").createSignedUploadUrl(safeFilename, { upsert: true });
  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true, ...data };
}

export async function finishDocumentUploadAction() {
  revalidatePath("/admin/belgeler");
}

export async function deleteDocumentAction(name: string) {
  const supabase = createServiceClient();
  await supabase.storage.from("belgeler").remove([name]);
  revalidatePath("/admin/belgeler");
}
