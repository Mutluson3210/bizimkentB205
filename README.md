This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Telefon uygulaması (PWA)

Site, telefona kurulabilen bir web uygulaması (PWA) olarak yapılandırıldı.
Sakin siteyi Safari/Chrome'da açıp **Ana Ekrana Ekle** dediğinde ikon olarak
kurulur ve adres çubuğu olmadan, uygulama gibi açılır. App Store / Play Store
hesabı veya ücreti gerekmez.

İlgili dosyalar:

| Dosya | İşi |
| --- | --- |
| `src/app/manifest.ts` | Uygulama adı, ikonlar, açılış adresi (`/panel`), renkler, Android kısayolları |
| `public/sw.js` | Service worker — statik dosya önbelleği ve çevrimdışı sayfası |
| `src/app/offline/page.tsx` | İnternet yokken gösterilen sayfa |
| `src/components/ServiceWorkerRegister.tsx` | Service worker kaydı (yalnızca production) |
| `src/components/InstallPrompt.tsx` | "Ana ekrana ekle" şeridi (Android'de tek tuş, iOS'ta tarif) |
| `public/icons/`, `src/app/apple-icon.png` | Ana ekran ikonları |

**Önemli:** Service worker HTML sayfalarını **önbelleğe almaz**. Panel sayfaları
oturuma bağlı (daire no, aidat tutarı, borç); bunların cihazda saklanması hem
gizlilik hem de bayat veri riski olurdu. Yalnızca `/_next/static/` altındaki
hash'li dosyalar, ikonlar ve çevrimdışı sayfası önbelleğe alınır.

`public/sw.js` her değiştirildiğinde dosyanın başındaki `CACHE_VERSION`
artırılmalı — eski önbellek ancak o zaman temizlenir.

### İkonları yeniden üretmek

`public/logo-mark.png` değişirse ikonlar yeniden üretilmeli. Tek seferlik
işlem olduğu için kalıcı bir script tutulmuyor; `sharp` ile 192/512 `any`,
192/512 `maskable` (içerik %56 — Android daireye kırpıyor) ve 180px
`apple-icon.png` üretilir.

### Production'ı yerelde denemek

Service worker yalnızca production build'inde kaydolur:

```bash
npm run build && npx next start -p 3100
```
