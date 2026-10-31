"use client";

import { useActionState } from "react";
import { errorBoxClass, inputClass, primaryButtonClass } from "@/lib/ui";
import { uploadDocumentAction, type UploadDocumentState } from "./actions";

const initialState: UploadDocumentState = {};

export function UploadForm() {
  const [state, formAction, pending] = useActionState(uploadDocumentAction, initialState);

  return (
    <form action={formAction} className="flex items-end gap-3">
      <input name="file" type="file" required className={inputClass} />
      <button type="submit" disabled={pending} className={primaryButtonClass}>
        {pending ? "Yükleniyor..." : "Yükle"}
      </button>
      {state.error && <p className={errorBoxClass}>{state.error}</p>}
    </form>
  );
}
