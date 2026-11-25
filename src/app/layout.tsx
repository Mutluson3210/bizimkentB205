import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { InstallPrompt } from "@/components/InstallPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Bizimkent B205",
  description: "Bizimkent B205 aidat, demirbaş ve sıcak su bilgilendirme portalı",
  applicationName: "Bizimkent B205",
  // iOS ana ekrandan açıldığında tarayıcı çubuğu olmadan, uygulama gibi açılsın.
  appleWebApp: {
    capable: true,
    // Ana ekranda ikonun altında yazan ad. manifest.ts'teki short_name ile
    // aynı tutulmalı: Android oradan, iOS buradan okuyor.
    title: "SİTE",
    statusBarStyle: "default",
  },
  other: {
    // Next yalnızca standart "mobile-web-app-capable" etiketini basıyor;
    // iOS 16.4 öncesi sürümler hâlâ Apple'ın eski adını arıyor.
    "apple-mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  // Android'de adres çubuğu ve görev listesi bu renge boyanır.
  themeColor: "#173f78",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="tr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <ServiceWorkerRegister />
        <InstallPrompt />
      </body>
    </html>
  );
}
