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

const CACHE_VERSION = "v1";
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
