import type { Tables } from "@/types/database";
import { parseYeniKalemler } from "@/lib/data/panel";

type Role = "owner" | "tenant";

/**
 * Mesajı Verimor'un kabul ettiği karakter kümesine indirger.
 *
 * Türkçe harfler BOZULMAZ. Verimor'un boy tablosuna göre Ş ş Ğ ğ ç ı İ
 * harfleri `datacoding=1` gerektiriyor ve bunun bedeli segment başına yalnızca
 * 5-8 karakter (155/298 yerine 160/306); Ö ö Ü ü Ç ise normal kodlamada da
 * geçerli, hiçbir bedeli yok. Yani Türkçe yazmak neredeyse ücretsiz.
 *
 * Asıl tehlike bu küme DIŞINDAKİ karakterler: tek bir uzun tire ya da akıllı
 * tırnak mesajı Unicode'a (`datacoding=2`) düşürür ve kapasite 70 karaktere
 * iner — maliyet iki üç katına çıkar. Bunlar özellikle demirbaş kalem
 * adlarında beklenir, çünkü o metinler Excel sütun başlıklarından geliyor ve
 * içeriğini biz denetlemiyoruz.
 *
 * Bu yüzden yaklaşım beyaz liste: bilinen karşılığı olanlar ASCII'ye çevrilir,
 * geri kalan tanınmayan karakterler atılır.
 */
function toSmsSafe(text: string): string {
  const karsiliklar: Record<string, string> = {
    "\u2013": "-", "\u2014": "-", "\u2010": "-", "\u2011": "-", // – — ‐ ‑
    "\u2018": "'", "\u2019": "'", "\u201A": "'", "\u2032": "'", // ' ' ‚ ′
    "\u201C": '"', "\u201D": '"', "\u201E": '"', "\u2033": '"', // " " „ ″
    "\u2026": "...", "\u00A0": " ", "\u2022": "-", "\u00B7": "-", // … nbsp • ·
    "\u20BA": "TL", "\u00BD": "1/2", "\u00BC": "1/4", "\u00BE": "3/4", // ₺ ½ ¼ ¾
  };
  // Listede olmayan her şey (emoji, °, ™, Latin dışı alfabeler) beyaz liste
  // tarafından atılır — anlamını koruyacak bir karşılığı olmadığı için.

  // GSM-7 temel kümesi + Türkçe kaydırma tablosu. Dışındakiler atılır.
  const izinli = /[A-Za-z0-9ŞşĞğİıÇçÖöÜü\n .,:;!?'"()\-+*\/=%&@_#$<>[\]]/;

  return Array.from(text)
    .map((harf) => karsiliklar[harf] ?? harf)
    .join("")
    .split("")
    .filter((harf) => izinli.test(harf))
    .join("");
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

  const parts = [`Bizimkent Sitesi ${daireNo} - ${periodLabel}:`];

  if (!aidat) {
    parts.push("Aidat verisi henüz girilmedi.");
  } else {
    // Kalemlerin toplamı her zaman `toplam`a eşit (72 dairede, iki dönemde
    // doğrulandı) — döküm ile toplam arasında tutarsızlık çıkmaz.
    const dokum = kalemDokumu(
      [
        { ad: "Devir", tutar: aidat.onceki_aydan_devir },
        { ad: "Sabit", tutar: aidat.sabit_aidat },
        { ad: "Doğalgaz", tutar: aidat.isinma_dogalgaz },
        { ad: "Sıcak su", tutar: aidat.sicak_su },
        { ad: "Gecikme", tutar: aidat.gecikme_tazminati },
      ],
      aidat.toplam,
    );
    parts.push(tutarSatiri("Aidat", aidat.toplam, dokum));
  }

  if (role === "owner") {
    if (!demirbas) {
      parts.push("Demirbaş verisi henüz girilmedi.");
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
      parts.push(tutarSatiri("Demirbaş", demirbas.toplam, dokum));
    }
  }

  // "Ödeme için siteye girin" demiyoruz: site ödeme almıyor, yalnızca
  // bilgi gösteriyor (banka/IBAN footer'da ve PDF makbuzda duruyor).
  // Uygulama = siteyle aynı yer, telefona kurulabilen PWA hali.
  parts.push("Detaylar için siteye ya da uygulamaya giriş yapabilirsiniz.");
  return toSmsSafe(parts.join(" "));
}

export function buildOtpMessage(code: string): string {
  return toSmsSafe(`Bizimkent Sitesi: Şifre sıfırlama kodunuz ${code}. 10 dakika geçerlidir. Bu kodu kimseyle paylaşmayın.`);
}
