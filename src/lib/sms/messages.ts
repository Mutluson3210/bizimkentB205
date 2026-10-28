import type { Tables } from "@/types/database";

type Role = "owner" | "tenant";

/** SMS maliyetini ikiye katlayan Unicode (GSM-7 dışı) segment'e düşmemek için
 * Türkçe özel karakterleri ASCII'ye çevirir ve TL tutarını "₺" yerine "TL" ile yazar. */
function toSmsSafe(text: string): string {
  return text
    .replace(/ş/g, "s").replace(/Ş/g, "S")
    .replace(/ç/g, "c").replace(/Ç/g, "C")
    .replace(/ğ/g, "g").replace(/Ğ/g, "G")
    .replace(/ı/g, "i").replace(/İ/g, "I")
    .replace(/ö/g, "o").replace(/Ö/g, "O")
    .replace(/ü/g, "u").replace(/Ü/g, "U");
}

function formatTlSms(value: number | null | undefined): string {
  const formatted = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2 }).format(value ?? 0);
  return `${formatted} TL`;
}

/**
 * Borç bildirim SMS metni. Demirbaş görünürlük kuralı burada RLS'den gelmiyor
 * (servis-rolüyle çalışılıyor) — bu yüzden tenant'a asla demirbaş tutarı
 * yazılmaması gerektiği kuralı BİLEREK burada tekrar uygulanıyor.
 */
export function buildDebtMessage(opts: {
  daireNo: string;
  periodLabel: string;
  role: Role;
  aidat: Tables<"aidat_kayit"> | null;
  demirbas: Tables<"demirbas_kayit"> | null;
}): string {
  const { daireNo, periodLabel, role, aidat, demirbas } = opts;

  const parts = [`Bizimkent B205 ${daireNo} - ${periodLabel}:`];

  parts.push(aidat ? `Aidat: ${formatTlSms(aidat.toplam)}.` : "Aidat verisi henüz girilmedi.");

  if (role === "owner") {
    parts.push(demirbas ? `Demirbas: ${formatTlSms(demirbas.toplam)}.` : "Demirbas verisi henüz girilmedi.");
  }

  parts.push("Detay için siteye giriş yapabilirsiniz.");
  return toSmsSafe(parts.join(" "));
}

export function buildOtpMessage(code: string): string {
  return toSmsSafe(`Bizimkent B205: Şifre sıfırlama kodunuz ${code}. 10 dakika geçerlidir. Bu kodu kimseyle paylaşmayın.`);
}
