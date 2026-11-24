"use client";

import { useEffect } from "react";

/** Service worker'ı kaydeder. Geliştirmede kayıt yapılmaz; dev sunucusunun
 * chunk'ları önbelleğe takılmasın diye varsa eski kayıt da temizlenir. */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      void navigator.serviceWorker
        .getRegistrations()
        .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
        .catch(() => undefined);
      return;
    }

    const register = () => {
      void navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => undefined);
    };

    // İlk açılışta sayfa yüklenmesiyle yarışmasın.
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
