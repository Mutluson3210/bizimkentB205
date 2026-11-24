/* Bizimkent B205 — PWA service worker
 *
 * Tasarım kararı: HTML sayfaları ASLA önbelleğe alınmaz. Panel sayfaları
 * oturuma bağlı (daire no, aidat tutarı, borç durumu); bunların cihazda
 * saklanması hem gizlilik hem de bayat veri riski demek. Önbelleğe yalnızca
 * build'e özgü, kişisel veri içermeyen statik dosyalar ve çevrimdışı
 * bilgilendirme sayfası alınır.
 *
 * Bu dosya değiştirildiğinde CACHE_VERSION artırılmalı — eski önbellek
 * activate adımında silinir.
 */

const CACHE_VERSION = "v2";
const CACHE_NAME = `b205-static-${CACHE_VERSION}`;
const OFFLINE_URL = "/offline";

/** Kurulumda peşin indirilenler: ağ yokken de gösterebilmemiz gerekenler. */
const PRECACHE = [OFFLINE_URL, "/logo-mark.png", "/site-seal.png", "/icons/icon-192.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Tek bir dosya 404 verirse addAll tümünü iptal eder; kurulum
      // çevrimdışı sayfası yüzünden patlamasın diye tek tek deniyoruz.
      await Promise.all(
        PRECACHE.map((url) => cache.add(url).catch(() => undefined)),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith("b205-static-") && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  // Server action'lar POST; oturum/şifre işlemleri de öyle. Sadece GET.
  if (request.method !== "GET") return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  // Supabase (auth, storage) ve diğer dış istekler service worker'a uğramasın.
  if (url.origin !== self.location.origin) return;

  // Sayfa gezinmeleri: daima ağdan. Ağ yoksa çevrimdışı sayfası.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const cached = await caches.match(OFFLINE_URL);
          return cached ?? Response.error();
        }
      })(),
    );
    return;
  }

  // İçeriği hash'li / değişmeyen statik dosyalar: önce önbellek.
  if (isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
  }

  // Geri kalan her şey (PDF makbuz, RSC istekleri, API) doğrudan ağa gider.
});

function isStaticAsset(pathname) {
  return (
    pathname.startsWith("/_next/static/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/logo-mark.png" ||
    pathname === "/site-seal.png"
  );
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  // Yalnızca aynı origin'den gelen başarılı yanıtlar saklanır.
  if (response.ok && response.type === "basic") {
    cache.put(request, response.clone()).catch(() => undefined);
  }
  return response;
}

/* --- Duyuru bildirimleri ---------------------------------------------- */

const DEFAULT_NOTIFICATION_URL = "/panel/duyurular";

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    // Beklenmedik gövde: bildirimi yutmak yerine genel bir metinle göster.
    payload = {};
  }

  const title = payload.title || "Bizimkent B205";
  const options = {
    body: payload.body || "Yeni bir duyuru var.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    lang: "tr",
    // Aynı etiketli bildirimler üst üste yığılmaz, sonuncusu öncekini değiştirir.
    tag: payload.tag || "duyuru",
    data: { url: payload.url || DEFAULT_NOTIFICATION_URL },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || DEFAULT_NOTIFICATION_URL;

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });

      // Uygulama zaten açıksa yeni pencere açma; açık olanı kullan.
      for (const client of windows) {
        if (new URL(client.url).pathname === target) {
          return client.focus();
        }
      }
      const open = windows[0];
      if (open && "navigate" in open) {
        await open.navigate(target);
        return open.focus();
      }
      return self.clients.openWindow(target);
    })(),
  );
});
