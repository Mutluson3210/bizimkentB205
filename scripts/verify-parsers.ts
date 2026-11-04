// Saf parser doğrulaması (DB'ye dokunmaz): Sıcak Su ve Sakin Roster parserları.
// Çalıştırma: npx tsx scripts/verify-parsers.ts
import * as XLSX from "xlsx";
import { parseSicakSuWorkbook } from "../src/lib/excel/parseSicakSu";
import { parseRosterWorkbook } from "../src/lib/excel/parseRoster";

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

console.log("\nTüm assertion'lar geçti (hata görünmüyorsa).");
