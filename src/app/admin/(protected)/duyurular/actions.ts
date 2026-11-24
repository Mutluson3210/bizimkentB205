"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAnnouncement, deleteAnnouncement, createAnnouncementAttachmentUploadUrl, type SignedUpload } from "@/lib/data/admin";
import { sendPushToAll } from "@/lib/push/send";

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

  // Bildirim duyurudan daha az önemli: sendPushToAll hata fırlatmaz, sonucu
  // döner. Gönderim başarısız olsa bile duyuru yayında ve sakin panelden
  // görür — bu yüzden akışı kesmiyoruz, sonucu redirect ile raporluyoruz.
  let pushInfo = "";
  if (formData.get("sendPush")) {
    const result = await sendPushToAll({
      title,
      // Uzun duyurunun tamamı bildirim baloncuğuna sığmaz; ilk cümleleri yeter.
      body: body.length > 120 ? `${body.slice(0, 117)}...` : body,
      url: "/panel/duyurular",
    });
    pushInfo = result.skipped
      ? `?push=atlandi&not=${encodeURIComponent(result.skipped)}`
      : `?push=${result.sent}&basarisiz=${result.failed}`;
  }

  redirect(`/admin/duyurular${pushInfo}`);
}

export async function deleteAnnouncementAction(id: string) {
  await deleteAnnouncement(id);
  revalidatePath("/admin/duyurular");
}
