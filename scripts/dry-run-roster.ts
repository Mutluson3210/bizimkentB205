import { readFileSync } from "node:fs";
import { parseRosterWorkbook } from "../src/lib/excel/parseRoster";

const path = process.argv[2];
if (!path) {
  console.error("Kullanım: npx tsx scripts/dry-run-roster.ts <xlsx-dosya-yolu>");
  process.exit(1);
}

const buf = readFileSync(path);
const arrayBuffer = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
const { rows, warnings } = parseRosterWorkbook(arrayBuffer as ArrayBuffer);

console.log(`Toplam ${rows.length} satır ayrıştırıldı (${rows.filter((r) => r.role === "owner").length} ev sahibi, ${rows.filter((r) => r.role === "tenant").length} kiracı).\n`);

for (const row of rows) {
  console.log(
    `${row.daireNoRaw.padEnd(10)} ${row.role === "owner" ? "Ev Sahibi" : "Kiracı  "} | ${row.fullName.padEnd(35)} | ${row.phone ?? "(telefon yok)"}`,
  );
}

if (warnings.length > 0) {
  console.log("\nUyarılar:");
  warnings.forEach((w) => console.log(" -", w));
}
