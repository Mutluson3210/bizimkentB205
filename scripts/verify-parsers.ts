// Saf parser doğrulaması (DB'ye dokunmaz): Sıcak Su ve Sakin Roster parserları.
// Çalıştırma: npx tsx scripts/verify-parsers.ts
import * as XLSX from "xlsx";
import { parseSicakSuWorkbook } from "../src/lib/excel/parseSicakSu";
import { parseRosterWorkbook } from "../src/lib/excel/parseRoster";
import { parseAidatDemirbasWorkbook } from "../src/lib/excel/parseAidatDemirbas";

function toBuffer(rows: unknown[][]): ArrayBuffer {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "S1");
  return XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
}

const sicakSuBuf = toBuffer([
  ["DAİRE NR.", "AYBAŞI SAYAÇ", "AYSONU SAYAÇ", "KULLANILAN M3", "M3 FİYATI", "SICAK SU PAYI TL"],
  ["D11-5", 426, 427, 1, 201, 201],
  ["B1.11-07", 218, 222, 4, 201, 804],
  // Alakasız özet tablo bitişte durulmalı:
  ["1.01.2026", 12525, 13055, 25580],
]);

const sicakSuRows = parseSicakSuWorkbook(sicakSuBuf);
console.log("Sıcak Su satırları:", sicakSuRows);
console.assert(sicakSuRows.length === 2, "Beklenen 2 satır (özet tablo dahil edilmemeli)");
console.assert(sicakSuRows[0].blockCode === "D11" && sicakSuRows[0].unitNo === 5, "D11-5 ayrıştırma hatalı");
console.assert(sicakSuRows[1].blockCode === "B1.11" && sicakSuRows[1].unitNo === 7, "B1.11-07 ayrıştırma hatalı");

const rosterBuf = toBuffer([
  ["Daire No", "Ad Soyad", "Telefon", "Rol"],
  ["B1.11-07", "Ayşe Yılmaz", "05551112233", "Ev Sahibi"],
  ["B1.11-07", "Mehmet Demir", "05339998877", "Kiracı"],
  ["D11-5", "Can Öz", "", "???"],
]);

const roster = parseRosterWorkbook(rosterBuf);
console.log("\nRoster satırları:", roster.rows);
console.log("Uyarılar:", roster.warnings);
console.assert(roster.rows.length === 2, "Tanınmayan rol satırı hariç 2 satır beklenir");
console.assert(roster.rows[0].role === "owner" && roster.rows[1].role === "tenant", "Rol eşleme hatalı");
console.assert(roster.warnings.some((w) => w.includes("???")), "Tanınmayan rol yakalanmalı");

// Başlığın iki satıra bölündüğü gerçek Sıcak Su dosyası düzeni: "DAİRE NR."
// alt satırda, "AYBAŞI/AYSONU/KULLANILAN/M3" üst satırda. Tek satıra bakan
// eski sütun tanıma sayaç ve m3 sütunlarını kaçırıyordu (Kasım 2026 yüklemesi).
const sicakSuIkiSatirBaslik = toBuffer([
  ["kasım  AYI  SICAK SU", null, null, null, null, null],
  ["KULLANIMLARI / MALİYETLERİ / DAİRELERE İSABET EDEN PAYLAR", null, null, null, null, null],
  [null, "AYBAŞI", "AYSONU", "KULLANILAN", "M3", "SICAK "],
  ["DAİRE NR.", "SAYAÇ", "SAYAÇ", "M3", "FİYATI", "SU PAYI TL"],
  ["B2.05A-01", 71, 71, 0, 161.6, 0],
  ["B2.05B-35", 95, 98, 3, 161.6, 484.8],
  [null, null, null, null, null, null],
  ["TOPLAM", null, null, 180, 161.6, 29088],
]);

const ikiSatir = parseSicakSuWorkbook(sicakSuIkiSatirBaslik);
console.log("\nİki satırlı başlık:", ikiSatir);
console.assert(ikiSatir.length === 2, "İki satırlı başlıkta 2 daire okunmalı (TOPLAM satırı hariç)");
console.assert(ikiSatir[1].daireNoRaw === "B2.05B-35", "Daire sırası/okuması hatalı");
console.assert(ikiSatir[1].aybasiSayac === 95, "Aybaşı sayaç okunamadı");
console.assert(ikiSatir[1].aysonuSayac === 98, "Aysonu sayaç okunamadı");
console.assert(ikiSatir[1].kullanilanM3 === 3, "Kullanılan m3 okunamadı");
console.assert(ikiSatir[1].m3Fiyati === 161.6, "M3 fiyatı okunamadı");
console.assert(ikiSatir[1].sicakSuPayiTl === 484.8, "Sıcak su payı okunamadı");
console.assert(ikiSatir[0].aysonuSayac === 71, "Sayaç farkı 0 olan daire de okunmalı");

// Gerçek Aidat/Demirbaş dosyası düzeni: aidat bölümünde "DEVİR AİDAT",
// "DEVİR DEMİRBAŞ", "ÖNCEKİ AY TAHSİLATI" ve "ÖNCEKİ AYDAN DEVİR" sütunları
// birlikte duruyor. Jenerik "DEVIR" eşleşmesi bunların hepsini aynı alana
// yazmaya çalışıyordu; her birinin doğru alana gittiği doğrulanır.
const aidatTamBaslik = toBuffer([
  ["KASIM AYI AİDAT TABLOSU", null, null, null, null, null, null, null, null, null, null, "KASIM AYI DEMİRBAŞ TABLOSU"],
  [
    "DAİRE NR.", "DEVİR AİDAT", "DEVİR DEMİRBAŞ", "ÖNCEKİ AY TAHSİLATI", "ÖNCEKİ AYDAN DEVİR",
    "GECİKME TAZMİNATI", "ISINMA DOĞALGAZ", "SICAK SU", "SABİT AİDAT", "TOPLAM",
    null, "ÖNCEKİ AYDAN DEVİR", "GECİKME TAZMİNATI", null, null, "TOPLAM",
  ],
  ["B2.05A-04", 3648.92, 0, 2690.41, 958.51, 47.93, 1726, 646.4, 3045, 6423.84, null, 120, 6, null, null, 126],
]);

const [aidatTam] = parseAidatDemirbasWorkbook(aidatTamBaslik);
console.log("\nAidat (tam başlık):", aidatTam);
console.assert(aidatTam.aidat.devirBorc === 3648.92, "DEVİR AİDAT -> devirBorc okunmalı");
console.assert(aidatTam.aidat.tahsilat === 2690.41, "ÖNCEKİ AY TAHSİLATI -> tahsilat okunmalı");
console.assert(aidatTam.aidat.devir === 958.51, "ÖNCEKİ AYDAN DEVİR, DEVİR DEMİRBAŞ ile karışmamalı");
console.assert(aidatTam.aidat.toplam === 6423.84, "Aidat toplamı hatalı");
console.assert(aidatTam.demirbas?.devir === 120 && aidatTam.demirbas?.toplam === 126, "Demirbaş bölümü hatalı");

// Eski dosya biçimi: "DEVİR AİDAT" ve "ÖNCEKİ AY TAHSİLATI" sütunları yok.
// Devir yine okunmalı, yeni iki alan null kalmalı (panelde satır gösterilmez).
const aidatEskiBaslik = toBuffer([
  ["DAİRE NR.", "ÖNCEKİ AYDAN DEVİR", "GECİKME TAZMİNATI", "ISINMA DOĞALGAZ", "SICAK SU", "SABİT AİDAT", "TOPLAM"],
  ["D11-5", 500, 25, 1726, 201, 2990, 5442],
]);

const [aidatEski] = parseAidatDemirbasWorkbook(aidatEskiBaslik);
console.log("\nAidat (eski başlık):", aidatEski);
console.assert(aidatEski.aidat.devir === 500, "Eski biçimde devir okunmalı");
console.assert(aidatEski.aidat.devirBorc === null, "Sütun yoksa devirBorc null olmalı");
console.assert(aidatEski.aidat.tahsilat === null, "Sütun yoksa tahsilat null olmalı");
console.assert(aidatEski.demirbas === null, "Demirbaş sütunları yokken demirbas null olmalı");

// Aynı dosyanın bir ay sonraki hâli: sütun adları elle değiştirilmiş ve
// "TAHSİLAT" yazım hatasıyla "TAHSLİAT" olmuş. Aynı kalemler yine doğru
// alanlara gitmeli (Kasım 2026'da bu yüzden iki satır boş kalmıştı).
const aidatYeniAdlar = toBuffer([
  ["KASIM AYI AİDAT TABLOSU", null, null, null, null, null, null, null, null, null, "KASIM AYI DEMİRBAŞ TABLOSU"],
  [
    "DAİRE NR.", "ÖNCEKİ AY AİDAT BORCU", "ÖNCEKİ AY BORCUNDAN TAHSLİAT", "ÖNCEKİ AYDAN DEVİR",
    "GECİKME TAZMİNATI", "ISINMA DOĞALGAZ", "SICAK SU", "SABİT AİDAT", "TOPLAM",
    null, "ÖNCEKİ AY DEMİRBAŞ BORCU", "ÖNCEKİ AY BORCUNDAN TAHSLİAT", "ÖNCEKİ AYDAN DEVİR",
    "GECİKME TAZMİNATI", null, null, "TOPLAM",
  ],
  ["B2.05A-04", 3648.92, 2690.41, 958.51, 47.93, 1726, 646.4, 3045, 6423.84, null, 300, 180, 120, 6, null, null, 126],
]);

const [aidatYeni] = parseAidatDemirbasWorkbook(aidatYeniAdlar);
console.log("\nAidat (yeni sütun adları):", aidatYeni);
console.assert(aidatYeni.aidat.devirBorc === 3648.92, "ÖNCEKİ AY AİDAT BORCU -> devirBorc okunmalı");
console.assert(aidatYeni.aidat.tahsilat === 2690.41, "ÖNCEKİ AY BORCUNDAN TAHSLİAT -> tahsilat okunmalı");
console.assert(aidatYeni.aidat.devir === 958.51, "ÖNCEKİ AYDAN DEVİR borç/ödeme ile karışmamalı");
console.assert(aidatYeni.aidat.gecikme === 47.93 && aidatYeni.aidat.sabit === 3045, "Diğer aidat kalemleri kaymamalı");
console.assert(aidatYeni.aidat.toplam === 6423.84, "Aidat toplamı hatalı");
console.assert(
  aidatYeni.demirbas?.devir === 120 && aidatYeni.demirbas?.gecikme === 6 && aidatYeni.demirbas?.toplam === 126,
  "Demirbaş bölümü, kendi borç/tahsilat sütunlarından etkilenmemeli",
);

console.log("\nTüm assertion'lar geçti (hata görünmüyorsa).");
