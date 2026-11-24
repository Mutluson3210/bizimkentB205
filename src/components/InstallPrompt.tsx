"use client";

import { useCallback, useEffect, useState } from "react";
import { LogoMark } from "@/components/Logo";
import { primaryButtonClass } from "@/lib/ui";

/** Chrome'un kurulum olayı; tip tanımı standart DOM lib'inde yok. */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "b205:install-dismissed-at";
const DISMISS_DAYS = 30;

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari standart API'yi desteklemiyor, kendi bayrağını kullanıyor.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafari(): boolean {
  const ua = window.navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) ||
    // iPadOS masaüstü Safari gibi görünür; dokunmatik varlığından anlıyoruz.
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (!ios) return false;
  // iOS'ta yalnızca Safari "Ana Ekrana Ekle" sunuyor.
  return !/crios|fxios|edgios|opt\//i.test(ua);
}

function recentlyDismissed(): boolean {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const at = Number(raw);
    if (!Number.isFinite(at)) return false;
    return Date.now() - at < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch {
    // Gizli sekmede localStorage erişimi hata verebilir.
    return false;
  }
}

/** "Ana ekrana ekle" yönlendirmesi: Android/masaüstü Chrome'da tek tuşla
 * kurulum, iOS Safari'de adım tarifi. Kurulu veya yakında kapatılmışsa
 * hiç görünmez. */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (isStandalone() || recentlyDismissed()) return;

    const onBeforeInstall = (event: Event) => {
      // Varsayılan mini bilgi çubuğu yerine kendi şeridimizi gösteriyoruz.
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setDeferred(null);
      setHidden(true);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // iOS'ta kurulum olayı yok, tarayıcıdan anlıyoruz. Şerit sayfa
    // oturduktan sonra gelsin — ilk boyamada göz zıplamasın.
    const hintTimer = window.setTimeout(() => {
      if (isIosSafari()) setShowIosHint(true);
    }, 1200);

    return () => {
      window.clearTimeout(hintTimer);
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = useCallback(() => {
    setHidden(true);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Yazılamazsa sorun değil; şerit bu oturumda kapalı kalır.
    }
  }, []);

  const install = useCallback(async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    // Olay tek kullanımlık; sonuç ne olursa olsun şeridi kaldırıyoruz.
    setDeferred(null);
    setHidden(true);
  }, [deferred]);

  if (hidden || (!deferred && !showIosHint)) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] print:hidden">
      <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-[0_8px_24px_rgba(16,24,40,0.12)]">
        <LogoMark size={40} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Telefonunuza ekleyin</p>
          {deferred ? (
            <p className="mt-0.5 text-xs text-muted">
              Uygulama gibi açılır, her seferinde adresi yazmanız gerekmez.
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-muted">
              Alttaki <span className="font-medium text-foreground">Paylaş</span> simgesine dokunun,
              açılan listeden <span className="font-medium text-foreground">Ana Ekrana Ekle</span>&rsquo;yi seçin.
            </p>
          )}
        </div>
        {deferred && (
          <button type="button" onClick={install} className={`${primaryButtonClass} shrink-0 px-3 py-2`}>
            Ekle
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Kapat"
          className="shrink-0 rounded-lg px-2 py-1 text-lg leading-none text-muted transition hover:bg-background hover:text-foreground"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
