"use client";

import { useActionState, useRef, useState, type FormEvent } from "react";
import { cardClass, errorBoxClass, inputClass, labelClass, primaryButtonClass } from "@/lib/ui";
import { createClient } from "@/lib/supabase/client";
import { createAnnouncementAction, createAttachmentUploadUrlAction, type CreateAnnouncementState } from "../actions";

const initialState: CreateAnnouncementState = {};

export default function YeniDuyuruPage() {
  const [state, formAction, pending] = useActionState(createAnnouncementAction, initialState);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Dosya baytları server action'dan GEÇMEZ — Vercel'in serverless
  // fonksiyonlardaki ~4.5MB istek gövdesi sınırına takılmasın diye, önce
  // dosya tarayıcıdan doğrudan Supabase Storage'a yüklenir, sonra sadece
  // elde edilen dosya yolu (küçük bir metin) forma eklenip `formAction`
  // (useActionState'in dispatch'i) FormData ile elle çağrılarak gönderilir.
  // Not: form'a hem `action` hem `onSubmit` BİRLİKTE koymayın — React'in
  // kendi form-action yönetimiyle çakışıp ikinci bir submit'in sessizce
  // kaybolmasına yol açabiliyor; bu yüzden form'da `action` prop'u yok.
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = fileInputRef.current?.files?.[0];

    if (file) {
      setUploading(true);
      setUploadError(null);

      const result = await createAttachmentUploadUrlAction(file.name);
      if ("error" in result) {
        setUploadError(`Dosya yüklenemedi: ${result.error}`);
        setUploading(false);
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.storage.from("duyuru-ekleri").uploadToSignedUrl(result.path, result.token, file);
      if (error) {
        setUploadError(`Dosya yüklenemedi: ${error.message}`);
        setUploading(false);
        return;
      }

      formData.set("attachmentPath", result.path);
      setUploading(false);
    }

    formAction(formData);
  }

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Yeni Duyuru</h2>

      <form onSubmit={handleSubmit} className={`flex flex-col gap-4 ${cardClass}`}>
        <label className={labelClass}>
          Başlık
          <input name="title" required className={inputClass} />
        </label>

        <label className={labelClass}>
          İçerik
          <textarea name="body" required rows={6} className={inputClass} />
        </label>

        <label className={labelClass}>
          Görsel veya Dosya Eki (opsiyonel)
          <input ref={fileInputRef} name="attachment" type="file" className={inputClass} />
        </label>

        {(uploadError || state.error) && <p className={errorBoxClass}>{uploadError ?? state.error}</p>}

        <button type="submit" disabled={pending || uploading} className={primaryButtonClass}>
          {uploading ? "Dosya yükleniyor..." : pending ? "Yayınlanıyor..." : "Yayınla"}
        </button>
      </form>
    </div>
  );
}
