"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAnnouncement, deleteAnnouncement, uploadAnnouncementAttachment } from "@/lib/data/admin";

export type CreateAnnouncementState = { error?: string };

export async function createAnnouncementAction(
  _prevState: CreateAnnouncementState,
  formData: FormData,
): Promise<CreateAnnouncementState> {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const file = formData.get("attachment");

  if (!title || !body) {
    return { error: "Başlık ve içerik boş olamaz." };
  }

  let attachmentPath: string | null = null;
  if (file instanceof File && file.size > 0) {
    try {
      attachmentPath = await uploadAnnouncementAttachment(file);
    } catch {
      return { error: "Dosya yüklenemedi, lütfen tekrar deneyin." };
    }
  }

  await createAnnouncement(title, body, attachmentPath);
  redirect("/admin/duyurular");
}

export async function deleteAnnouncementAction(id: string) {
  await deleteAnnouncement(id);
  revalidatePath("/admin/duyurular");
}
