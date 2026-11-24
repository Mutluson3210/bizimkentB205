"use client";

import { useCallback, useRef, useState } from "react";
import { inputClass, labelClass } from "@/lib/ui";

/**
 * Şifre alanı + tek dokunuşluk "Yapıştır".
 *
 * iOS Safari, odaklanmamış boş bir alana uzun basıldığında "Yapıştır"
 * balonunu göstermiyor; kullanıcı önce alana dokunup odaklamak, sonra
 * basılı tutmak zorunda kalıyor. Düğme bu dansı ortadan kaldırıyor:
 * Clipboard API'si varsa panoyu doğrudan okur (iOS tek bir onay sorar),
 * yoksa en azından alanı odaklayıp uzun basma yolunu tarif eder.
 */
export function PasswordField({
  name = "password",
  id = "password",
  label = "Şifre",
  autoComplete = "current-password",
  required = true,
}: {
  name?: string;
  id?: string;
  label?: string;
  /** Yeni şifre alanlarında "new-password" geçilmeli. */
  autoComplete?: "current-password" | "new-password";
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [hint, setHint] = useState<string | null>(null);

  const paste = useCallback(async () => {
    const input = inputRef.current;
    if (!input) return;

    const fallback = () => {
      input.focus();
      setHint("Panoya erişilemedi. Alana dokunup basılı tutarak Yapıştır'ı seçin.");
    };

    if (!navigator.clipboard?.readText) {
      fallback();
      return;
    }

    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        input.focus();
        setHint("Panoda yapıştırılacak bir şey yok.");
        return;
      }
      // Kopyalarken araya karışan boşluk/satır sonu şifreyi bozuyor; kırpıyoruz.
      input.value = text.trim();
      input.focus();
      setHint(null);
    } catch {
      // Kullanıcı iOS'un onay düğmesine basmadı ya da izin reddedildi.
      fallback();
    }
  }, []);

  return (
    <div className={labelClass}>
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id}>{label}</label>
        <button
          type="button"
          onClick={paste}
          className="text-xs font-medium text-brand-navy hover:underline"
        >
          Yapıştır
        </button>
      </div>
      <input
        ref={inputRef}
        id={id}
        name={name}
        type="password"
        required={required}
        // Kayıtlı şifre varsa iOS/Android klavyenin üstünde önerir —
        // kopyala-yapıştır ihtiyacını tamamen ortadan kaldırır.
        autoComplete={autoComplete}
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className={inputClass}
      />
      {hint && <p className="text-xs font-normal text-muted">{hint}</p>}
    </div>
  );
}
