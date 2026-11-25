import type { Tables } from "@/types/database";
import { parseYeniKalemler } from "@/lib/data/panel";

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

function formatTutar(value: number | null | undefined): string {
  // maximumFractionDigits şart: yalnızca minimum verilince varsayılan üst sınır
  // 3 oluyor ve 29792.3212 gibi değerler "29.792,321 TL" diye yazılıyordu.
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function formatTlSms(value: number | null | undefined): string {
  return `${formatTutar(value)} TL`;
}

/**
 * Aidat kalemlerini "Devir -1.200,00 + Sabit 3.045,00 + Dogalgaz 1.726,00"
 * biçiminde dizer. Sıfır kalemler atlanır (her dairede doğalgaz/sabit var ama
 * gecikme yalnızca birkaçında) ve negatif kalemler "+ -1.200,00" yerine
 * "- 1.200,00" olarak yazılır — devir dairelerin çoğunda alacak, yani negatif.
 */
/**
 * "Aidat 5.255,80 TL = Sabit ... " ya da toplam eksiyse
 * "Aidat alacağınız: 2.151,85 TL." satırını kurar.
 *
 * Eksi toplam sakinin borçlu değil ALACAKLI olduğu anlamına gelir; "-2.151,85 TL"
 * yazmak sakini yanıltıyordu. Bu durumda kalem dökümü de gösterilmez — dökümün
 * toplamı eksi olduğu için "alacağınız 2.151,85 = Devir -5.000,00 + ..." gibi
 * kendi içinde çelişen bir eşitlik çıkardı; ayrıntı zaten sitede duruyor.
 */
function tutarSatiri(baslik: string, toplam: number, dokum: string | null): string {
  // Kuruşa yuvarlanmış değere bakılır: -0,0000001 gibi artıklar "alacağınız
  // 0,00 TL" diye saçma bir cümle üretiyordu. (-0 < 0 yanlış olduğu için
  // yuvarlama bu durumu kendiliğinden eler.)
  if (Math.round(toplam * 100) / 100 < 0) {
    return `${baslik} alacağınız: ${formatTlSms(Math.abs(toplam))}.`;
  }
  return dokum ? `${baslik} ${formatTlSms(toplam)} = ${dokum}.` : `${baslik}: ${formatTlSms(toplam)}.`;
}

/** Excel sütun başlığından gelen kalem adı; satır sonu / çift boşluk içerebilir. */
function temizleAciklama(aciklama: string): string {
  return aciklama.replace(/\s+/g, " ").trim() || "Kalem";
}

function kalemDokumu(
  kalemler: Array<{ ad: string; tutar: number }>,
  toplam: number,
): string | null {
  const dolu = kalemler.filter(({ tutar }) => tutar !== 0);
  if (dolu.length === 0) return null;

  // Döküm toplamı `toplam` ile çelişiyorsa hiç döküm gösterme. Bozuk bir
  // jsonb kalemi elendiğinde ya da şema değiştiğinde sakine birbirini
  // tutmayan iki rakam göstermektense yalnızca toplamı göstermek doğru.
  const kalemToplami = dolu.reduce((acc, { tutar }) => acc + tutar, 0);
  if (Math.abs(kalemToplami - toplam) > 0.01) return null;

  return dolu
    .map(({ ad, tutar }, i) => {
      const mutlak = formatTutar(Math.abs(tutar));
      if (i === 0) return `${ad} ${tutar < 0 ? "-" : ""}${mutlak}`;
      return `${tutar < 0 ? "-" : "+"} ${ad} ${mutlak}`;
    })
    .join(" ");
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

  if (!aidat) {
    parts.push("Aidat verisi henüz girilmedi.");
  } else {
    // Kalemlerin toplamı her zaman `toplam`a eşit (72 dairede, iki dönemde
    // doğrulandı) — döküm ile toplam arasında tutarsızlık çıkmaz.
    const dokum = kalemDokumu(
      [
        { ad: "Devir", tutar: aidat.onceki_aydan_devir },
        { ad: "Sabit", tutar: aidat.sabit_aidat },
        { ad: "Dogalgaz", tutar: aidat.isinma_dogalgaz },
        { ad: "Sicak su", tutar: aidat.sicak_su },
        { ad: "Gecikme", tutar: aidat.gecikme_tazminati },
      ],
      aidat.toplam,
    );
    parts.push(tutarSatiri("Aidat", aidat.toplam, dokum));
  }

  if (role === "owner") {
    if (!demirbas) {
      parts.push("Demirbas verisi henüz girilmedi.");
    } else {
      // Demirbaş kalemleri aidattaki gibi sabit değil: Excel'de o ay hangi
      // sütunlar varsa `yeni_kalemler`e öyle giriyor (başlık = kalemin adı).
      // Döküm bu yüzden veriden üretiliyor, elle sayılmıyor.
      const dokum = kalemDokumu(
        [
          { ad: "Devir", tutar: demirbas.onceki_aydan_devir },
          { ad: "Gecikme", tutar: demirbas.gecikme_tazminati },
          ...(parseYeniKalemler(demirbas.yeni_kalemler) ?? []).map((k) => ({
            ad: temizleAciklama(k.aciklama),
            tutar: k.tutar,
          })),
        ],
        demirbas.toplam,
      );
      parts.push(tutarSatiri("Demirbas", demirbas.toplam, dokum));
    }
  }

  // Banka adı + IBAN yazmak yerine siteye yönlendiriliyor; ödeme bilgisi
  // sitede ve PDF makbuzda zaten var. Kısa tutuluyor çünkü kalem dökümü
  // mesajı ikinci segmente taşıyor, kapanış cümlesi de uzasın istemiyoruz.
  parts.push("Odeme ve detay icin siteye giris yapin.");
  return toSmsSafe(parts.join(" "));
}

export function buildOtpMessage(code: string): string {
  return toSmsSafe(`Bizimkent B205: Şifre sıfırlama kodunuz ${code}. 10 dakika geçerlidir. Bu kodu kimseyle paylaşmayın.`);
}
