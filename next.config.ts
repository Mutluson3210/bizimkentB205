import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  /* Next'in server action'lar için varsayılanı 1MB. Sakin listesi / aidat
     Excel yüklemeleri server action'dan geçiyor (dosya parse edilip DB'ye
     yazılıyor, Storage'a kaydedilmiyor — bu yüzden PDF/görsel eklerindeki
     gibi "doğrudan tarayıcıdan yükle" numarası burada uygulanamaz).
     Vercel'in serverless fonksiyonlardaki istek gövdesi sınırı ~4.5MB; bu
     sınırın altında, mevcut varsayılandan daha geniş bir pay bırakıyoruz. */
  experimental: {
    serverActions: {
      bodySizeLimit: "4mb",
    },
  },
  /* Bu uygulamadaki her sayfa oturuma (cookie) bağlı ve dinamik render edilir;
     statik/cache optimizasyonuna uygun değil, bu yüzden kapalı. */
  // PDF makbuz route'u fontu process.cwd() üzerinden dosya yolu ile okuyor —
  // Vercel'in serverless fonksiyon paketlemesinde bu dosyanın garanti dahil
  // edilmesi için (file tracing bazen dinamik olmayan ama kod dışı kaynakları
  // kaçırabilir).
  outputFileTracingIncludes: {
    "/panel/makbuz/[periodId]": ["./src/assets/fonts/**"],
  },
  turbopack: {
    root: path.join(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
