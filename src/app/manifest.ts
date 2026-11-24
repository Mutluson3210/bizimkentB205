import type { MetadataRoute } from "next";

/** Telefona "ana ekrana ekle" ile kurulduğunda uygulamanın kimliği.
 * Next bu dosya varsa <link rel="manifest"> etiketini kendisi ekler. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Bizimkent B205 A/B",
    short_name: "B205",
    description: "Bizimkent B205 aidat, demirbaş ve sıcak su bilgilendirme portalı",
    lang: "tr",
    dir: "ltr",
    // Kurulu uygulama doğrudan panele açılsın; oturum yoksa /panel zaten
    // /giris'e yönlendiriyor.
    start_url: "/panel",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f4f6f9",
    theme_color: "#173f78",
    categories: ["utilities", "finance"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android ikonu daireye/squircle'a kırptığı için içeriği dar tutulmuş ayrı sürüm.
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // Android'de uygulama ikonuna basılı tutunca çıkan kısayollar.
    shortcuts: [
      { name: "Güncel Ay", url: "/panel" },
      { name: "Duyurular", url: "/panel/duyurular" },
      { name: "Belgeler", url: "/panel/belgeler" },
    ],
  };
}
