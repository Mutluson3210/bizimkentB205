"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { errorBoxClass, inputClass, primaryButtonClass } from "@/lib/ui";
import { createClient } from "@/lib/supabase/client";
import { createDocumentUploadUrlAction, finishDocumentUploadAction } from "./actions";

export function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const file = inputRef.current?.files?.[0];
    if (!file) {
      setError("Bir dosya seçin.");
      return;
    }

    setPending(true);
    setError(null);

    const result = await createDocumentUploadUrlAction(file.name);
    if (!result.ok) {
      setError(`Yükleme başarısız: ${result.error}`);
      setPending(false);
      return;
    }

    const supabase = createClient();
    const { error: uploadError } = await supabase.storage
      .from("belgeler")
      .uploadToSignedUrl(result.path, result.token, file);

    if (uploadError) {
      setError(`Yükleme başarısız: ${uploadError.message}`);
      setPending(false);
      return;
    }

    await finishDocumentUploadAction();
    if (inputRef.current) inputRef.current.value = "";
    setPending(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-3">
      <input ref={inputRef} name="file" type="file" required className={inputClass} />
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Yükleniyor..." : "Yükle"}
      </button>
      {error && <p className={errorBoxClass}>{error}</p>}
    </form>
  );
}
