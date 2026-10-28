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
console.log("Tanınmayan roller:", roster.unrecognizedRoles);
console.assert(roster.rows.length === 2, "Tanınmayan rol satırı hariç 2 satır beklenir");
console.assert(roster.rows[0].role === "owner" && roster.rows[1].role === "tenant", "Rol eşleme hatalı");
console.assert(roster.unrecognizedRoles.includes("???"), "Tanınmayan rol yakalanmalı");

console.log("\nTüm assertion'lar geçti (hata görünmüyorsa).");
