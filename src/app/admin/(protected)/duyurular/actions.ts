"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAnnouncement, deleteAnnouncement } from "@/lib/data/admin";

export type CreateAnnouncementState = { error?: string };

export async function createAnnouncementAction(
  _prevState: CreateAnnouncementState,
  formData: FormData,
): Promise<CreateAnnouncementState> {
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!title || !body) {
    return { error: "Başlık ve içerik boş olamaz." };
  }

  await createAnnouncement(title, body);
  redirect("/admin/duyurular");
}

export async function deleteAnnouncementAction(id: string) {
  await deleteAnnouncement(id);
  revalidatePath("/admin/duyurular");
}
