"use client";

import { useCallback, useEffect, useState } from "react";
import { cardClass, primaryButtonClass } from "@/lib/ui";
import { DISMISS_KEY } from "@/components/InstallPrompt";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "ios" | "android" | "desktop";

function detectPlatform(): Platform {
  const ua = window.navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

/** Kurulum şeridi kapatıldığında da kaybolmayan kalıcı yardım bağlantısı.
 * Uygulama kurulduysa CSS ile gizlenir — standalone modda anlamsız. */
export function InstallHelp() {
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // InstallPrompt da aynı olayı dinliyor; olay iki dinleyiciye de ulaşır.
    const onBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const toggle = useCallback(() => {
    // Platformu tıklama anında okuyoruz; sunucuda window yok.
    setPlatform(detectPlatform());
    setOpen((value) => !value);
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setOpen(false);
    try {
      // Kurulduysa şerit bir daha çıkmasın.
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Yazılamazsa sorun değil.
    }
  }, [deferred]);

  return (
    <div className="hide-when-installed w-full max-w-sm print:hidden">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        className="mx-auto block text-sm font-medium text-muted transition-colors hover:text-brand-navy hover:underline"
      >
        Telefonunuza nasıl eklersiniz?
      </button>

      {open && (
        <div className={`${cardClass} mt-3 text-sm`}>
          <p className="font-semibold text-foreground">Ana ekrana ekleyin</p>
          <p className="mt-1 text-muted">
            Site telefonunuzda uygulama gibi açılır; her seferinde adresi yazmanız gerekmez.
          </p>

          {platform === "ios" && (
            <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-muted">
              <li>
                Bu sayfayı <span className="font-medium text-foreground">Safari</span> ile açın
                (iPhone&rsquo;da yalnızca Safari ekleyebiliyor).
              </li>
              <li>
                Ekranın altındaki <span className="font-medium text-foreground">Paylaş</span> simgesine
                dokunun — yukarı ok çıkan kare.
              </li>
              <li>
                Listeyi kaydırıp <span className="font-medium text-foreground">Ana Ekrana Ekle</span>&rsquo;yi seçin.
              </li>
              <li>
                Sağ üstteki <span className="font-medium text-foreground">Ekle</span> düğmesine basın.
              </li>
            </ol>
          )}

          {platform === "android" && (
            <>
              {deferred ? (
                <button type="button" onClick={install} className={`${primaryButtonClass} mt-3 w-full`}>
                  Ana Ekrana Ekle
                </button>
              ) : (
                <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-muted">
                  <li>
                    Sağ üstteki <span className="font-medium text-foreground">⋮</span> menüsüne dokunun.
                  </li>
                  <li>
                    <span className="font-medium text-foreground">Uygulamayı yükle</span> veya{" "}
                    <span className="font-medium text-foreground">Ana ekrana ekle</span> seçeneğini seçin.
                  </li>
                </ol>
              )}
            </>
          )}

          {platform === "desktop" && (
            <p className="mt-3 text-muted">
              Bu özellik telefon ve tabletler içindir. Telefonunuzun tarayıcısından{" "}
              <span className="font-medium text-foreground">bizimkentb205.com</span> adresine girip bu
              bağlantıya tekrar dokunun.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
