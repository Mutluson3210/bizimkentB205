"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAnnouncement, deleteAnnouncement, createAnnouncementAttachmentUploadUrl, type SignedUpload } from "@/lib/data/admin";

export type CreateAnnouncementState = { error?: string };

export async function createAttachmentUploadUrlAction(filename: string): Promise<SignedUpload | { error: string }> {
  try {
    return await createAnnouncementAttachmentUploadUrl(filename);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Yükleme URL'si oluşturulamadı." };
  }
}

export async function createAnnouncementAction(
  _prevState: CreateAnnouncementState,
  formData: FormData,
): Promise<CreateAnnouncementState> {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const attachmentPath = String(formData.get("attachmentPath") ?? "").trim() || null;

  if (!title || !body) {
    return { error: "Başlık ve içerik boş olamaz." };
  }

  await createAnnouncement(title, body, attachmentPath);
  redirect("/admin/duyurular");
}

export async function deleteAnnouncementAction(id: string) {
  await deleteAnnouncement(id);
  revalidatePath("/admin/duyurular");
}
