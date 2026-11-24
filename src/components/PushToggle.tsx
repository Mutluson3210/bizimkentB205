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
  | { kind: "unavailable"; reason: "unsupported" | "ios-needs-install" }
  | { kind: "off" }
  | { kind: "on"; endpoint: string }
  /** Kullanıcı izni reddetmiş; tarayıcı ayarından açması gerek. */
  | { kind: "blocked" };

function isStandalone(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
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
        setState({
          kind: "unavailable",
          reason: isIos() && !isStandalone() ? "ios-needs-install" : "unsupported",
        });
        return;
      }

      if (Notification.permission === "denied") {
        setState({ kind: "blocked" });
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      setState(existing ? { kind: "on", endpoint: existing.endpoint } : { kind: "off" });
    })().catch(() => setState({ kind: "unavailable", reason: "unsupported" }));
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
        Duyuru bildirimi almak için önce bu sayfayı ana ekranınıza ekleyin —
        iPhone&rsquo;da bildirimler yalnızca ana ekrandan açılan uygulamada çalışır.
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
    return (
      <div className="mb-6 flex items-center justify-between gap-3 text-xs text-muted">
        <span>🔔 Yeni duyurular telefonunuza bildirim olarak gelecek.</span>
        <button
          type="button"
          onClick={disable}
          disabled={busy}
          className="shrink-0 font-medium text-brand-navy hover:underline disabled:opacity-50"
        >
          {busy ? "..." : "Kapat"}
        </button>
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
