"use client";

import { useCallback, useEffect, useState } from "react";
import { cardClass, primaryButtonClass } from "@/lib/ui";
import {
  savePushSubscriptionAction,
  removePushSubscriptionAction,
} from "@/app/panel/push-actions";

/** VAPID public key base64url olarak gelir; subscribe() ham bayt istiyor.
 * Dönüş tipi ArrayBuffer'a sabitlendi — TypeScript'in genel Uint8Array'i
 * BufferSource ile uyuşmuyor. */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const normalized = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(normalized);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

type State =
  | { kind: "loading" }
  /** Tarayıcı push desteklemiyor ya da iOS'ta uygulama kurulu değil. */
  | { kind: "unavailable"; reason: "unsupported" | "ios-needs-install" | "ios-too-old" }
  | { kind: "off" }
  | { kind: "on"; endpoint: string }
  /** Kullanıcı izni reddetmiş; tarayıcı ayarından açması gerek. */
  | { kind: "blocked" }
  /** Service worker aktif olmadı — sayfa yenilenince düzelir. */
  | { kind: "sw-not-ready" };

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

/** serviceWorker.ready'yi en fazla 5 saniye bekler. Süre dolarsa null. */
async function readyWithTimeout(): Promise<ServiceWorkerRegistration | null> {
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 5000)),
  ]);
}

function isIos(): boolean {
  const ua = window.navigator.userAgent;
  return (
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Duyuru bildirimleri aç/kapat. Tarayıcı izin penceresi ancak kullanıcı
 * tıklamasıyla açılabildiği için otomatik abone olmuyoruz. */
export function PushToggle() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // setState'ler async callback içinde; efekt gövdesinde senkron değil.
    void (async () => {
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
        // iPhone'da push yalnızca ana ekrana kurulmuş uygulamada çalışır —
        // Safari sekmesinde PushManager hiç tanımlı olmaz.
        // iPhone'da push yalnızca iOS 16.4+ ve ana ekrana kurulmuş
        // uygulamada çalışır. Kurulu olduğu halde desteklenmiyorsa sebep
        // sürümdür; ikisini de sessiz geçmiyoruz.
        const reason = isIos()
          ? isStandalone()
            ? ("ios-too-old" as const)
            : ("ios-needs-install" as const)
          : ("unsupported" as const);
        setState({ kind: "unavailable", reason });
        return;
      }

      if (Notification.permission === "denied") {
        setState({ kind: "blocked" });
        return;
      }

      // DİKKAT: serviceWorker.ready, aktif bir service worker yoksa hiç
      // çözülmez — sonsuza kadar bekler. Zaman aşımı olmadan bileşen
      // "yükleniyor" durumunda kalıp sessizce hiçbir şey göstermez.
      const registration = await readyWithTimeout();
      if (!registration) {
        setState({ kind: "sw-not-ready" });
        return;
      }

      const existing = await registration.pushManager.getSubscription();
      setState(existing ? { kind: "on", endpoint: existing.endpoint } : { kind: "off" });
    })().catch(() => setState({ kind: "sw-not-ready" }));
  }, []);

  const enable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? { kind: "blocked" } : { kind: "off" });
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) {
        setError("Bildirim altyapısı yapılandırılmamış.");
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        // Her push'ta görünür bildirim göstereceğimizin taahhüdü; zorunlu.
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      const json = subscription.toJSON();
      const result = await savePushSubscriptionAction({
        endpoint: subscription.endpoint,
        p256dh: json.keys?.p256dh ?? "",
        auth: json.keys?.auth ?? "",
        userAgent: navigator.userAgent,
      });

      if (!result.ok) {
        // Sunucuya yazılamadıysa tarayıcı tarafını da geri al; yoksa
        // "açık" görünüp hiç bildirim gelmeyen bir durum kalır.
        await subscription.unsubscribe();
        setError(result.error);
        setState({ kind: "off" });
        return;
      }

      setState({ kind: "on", endpoint: subscription.endpoint });
    } catch {
      setError("Bildirimler açılamadı. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await removePushSubscriptionAction(subscription.endpoint);
        await subscription.unsubscribe();
      }
      setState({ kind: "off" });
    } catch {
      setError("Bildirimler kapatılamadı. Lütfen tekrar deneyin.");
    } finally {
      setBusy(false);
    }
  }, []);

  if (state.kind === "loading") return null;

  if (state.kind === "unavailable") {
    if (state.reason === "unsupported") return null;
    return (
      <p className="mb-6 text-xs text-muted">
        {state.reason === "ios-needs-install"
          ? "Duyuru bildirimi almak için önce bu sayfayı ana ekranınıza ekleyin — iPhone'da bildirimler yalnızca ana ekrandan açılan uygulamada çalışır."
          : "Telefonunuzun iOS sürümü web bildirimlerini desteklemiyor; bunun için iOS 16.4 veya üstü gerekiyor."}
      </p>
    );
  }

  if (state.kind === "sw-not-ready") {
    return (
      <p className="mb-6 text-xs text-muted">
        Bildirim ayarı henüz hazır değil. Sayfayı bir kez yenileyin; ana ekrana
        eklediyseniz uygulamayı tamamen kapatıp yeniden açın.
      </p>
    );
  }

  if (state.kind === "blocked") {
    return (
      <p className="mb-6 text-xs text-muted">
        Bildirim izni tarayıcı ayarlarından engellenmiş. Açmak için site
        ayarlarından bildirimlere izin verin.
      </p>
    );
  }

  if (state.kind === "on") {
    // Açık durum, kapalı durumla AYNI kart düzeninde ve düğmenin durduğu yerde
    // yeşil bir rozetle gösteriliyor: sakin "Bildirimleri Aç"a bastıktan sonra
    // aynı noktada yeşil bir onay görüyor.
    //
    // Rozet bilerek <button> DEĞİL. Yeşil düğmeye basınca bildirimler kapansa,
    // renk "açık" derken eylem "kapat" olurdu. Bu alanda zaten bir kez
    // yanılgı yaşandı; aşağıdaki uyarı o yüzden duruyor.
    //
    // DİKKAT: Kapatma yazısı yalnızca "Kapat" OLMAMALI. Türkçede hem "bu
    // mesajı kapat" hem "bildirimleri kapat" anlamına geliyor; kullanıcı
    // mesajı kapattığını sanıp aboneliğini siliyor. Eylem açıkça yazılmalı.
    return (
      <div className={`${cardClass} mb-6 flex flex-wrap items-center justify-between gap-3`}>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">Duyuru bildirimleri açık</p>
          <p className="mt-0.5 text-xs text-muted">
            Yeni duyuru girildiğinde telefonunuza bildirim gelecek.
          </p>
          {error && <p className="mt-1 text-xs text-brand-red">{error}</p>}
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1">
          <span className="inline-flex items-center justify-center rounded-lg bg-brand-green px-4 py-2.5 text-sm font-medium text-white">
            ✓ Bildirimler Açık
          </span>
          <button
            type="button"
            onClick={disable}
            disabled={busy}
            className="text-xs font-medium text-muted hover:text-brand-navy hover:underline disabled:opacity-50"
          >
            {busy ? "Kapatılıyor..." : "Bildirimleri kapat"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${cardClass} mb-6 flex flex-wrap items-center justify-between gap-3`}>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">Duyurulardan haberdar olun</p>
        <p className="mt-0.5 text-xs text-muted">
          Yeni duyuru girildiğinde telefonunuza bildirim gelsin.
        </p>
        {error && <p className="mt-1 text-xs text-brand-red">{error}</p>}
      </div>
      <button
        type="button"
        onClick={enable}
        disabled={busy}
        className={`${primaryButtonClass} shrink-0`}
      >
        {busy ? "Açılıyor..." : "Bildirimleri Aç"}
      </button>
    </div>
  );
}
