import * as XLSX from "xlsx";

export function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .toUpperCase()
    .replace(/İ/g, "I")
    .replace(/Ş/g, "S")
    .replace(/Ğ/g, "G")
    .replace(/Ü/g, "U")
    .replace(/Ö/g, "O")
    .replace(/Ç/g, "C")
    .replace(/\s+/g, " ")
    .trim();
}

export function parseTRNumber(value: unknown): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return value;
  const s = String(value).trim();
  if (s === "") return 0;
  // Türkçe biçim: binlik ayraç "." , ondalık ayraç ","
  const normalized = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}

export const DAIRE_NO_PATTERN = /^([A-Za-z0-9.]+)-(\d+)$/;

export function parseDaireNo(raw: unknown): { blockCode: string; unitNo: number } | null {
  const s = String(raw ?? "").trim();
  const m = s.match(DAIRE_NO_PATTERN);
  if (!m) return null;
  return { blockCode: m[1], unitNo: parseInt(m[2], 10) };
}

export type SheetGrid = unknown[][];

export function readWorkbookSheets(buffer: ArrayBuffer): SheetGrid[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  return workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: null });
  });
}

/** İlk hücresi "BLOK-123" desenine uyan satırları (veri satırları) başlangıç
 * indeksinden itibaren toplar; desene uymayan ilk satırda durur
 * (dipnot/IBAN gibi footer metinlerini otomatik eler). */
export function collectDataRows(grid: SheetGrid, startRow: number, daireColIndex: number): number[] {
  const rows: number[] = [];
  for (let r = startRow; r < grid.length; r++) {
    const cell = grid[r]?.[daireColIndex];
    if (!parseDaireNo(cell)) break;
    rows.push(r);
  }
  return rows;
}

/** "DAİRE" içeren bir hücrenin bulunduğu ilk satırı başlık satırı kabul eder. */
export function findHeaderRow(grid: SheetGrid, headerMustInclude: string): number {
  for (let r = 0; r < Math.min(grid.length, 20); r++) {
    const row = grid[r] ?? [];
    if (row.some((cell) => normalizeHeader(cell).includes(headerMustInclude))) {
      return r;
    }
  }
  return -1;
}

/**
 * `findHeaderRow`'un aksine, sayfanın TAMAMINI tarar ve eşleşen HER satırı
 * döndürür — bir sayfada birden fazla blok, her biri kendi başlık satırıyla
 * art arda tekrar edebiliyor (ör. tek sayfada 4 blok, her blok öncesi aynı
 * "DAİRE NR." başlığı tekrarlanıyor).
 */
export function findHeaderRows(grid: SheetGrid, headerMustInclude: string): number[] {
  const rows: number[] = [];
  for (let r = 0; r < grid.length; r++) {
    const row = grid[r] ?? [];
    if (row.some((cell) => normalizeHeader(cell).includes(headerMustInclude))) {
      rows.push(r);
    }
  }
  return rows;
}

/**
 * Başlıklar tek satıra sığmayıp ÜST satıra taşabiliyor: Sıcak Su dosyasında
 * üst satırda "AYBAŞI / AYSONU / KULLANILAN / M3", alt satırda "SAYAÇ / SAYAÇ /
 * M3 / FİYATI" yazıyor ve "DAİRE NR." yalnızca alt satırda. Tek satıra bakan
 * sütun tanıma bu durumda yarısını kaçırır; bu yüzden başlık satırının
 * üstündeki en fazla `lookUp` satır, sütun sütun birleştirilip tek bir etiket
 * listesi üretilir ("AYBAŞI" + "SAYAÇ" -> "AYBASI SAYAC").
 *
 * Üstteki satır bir veri satırıysa (önceki bloğun son satırı) birleştirme orada
 * durur — tek sayfada art arda gelen bloklar arasında sızıntı olmaz.
 */
export function stackedHeaderLabels(grid: SheetGrid, headerRowIdx: number, lookUp = 2): string[] {
  const rowIdxs: number[] = [];
  for (let r = headerRowIdx - 1; r >= 0 && headerRowIdx - r <= lookUp; r--) {
    if ((grid[r] ?? []).some((cell) => parseDaireNo(cell))) break;
    rowIdxs.unshift(r);
  }
  rowIdxs.push(headerRowIdx);

  const width = Math.max(0, ...rowIdxs.map((r) => (grid[r] ?? []).length));
  const labels: string[] = [];
  for (let c = 0; c < width; c++) {
    labels[c] = rowIdxs
      .map((r) => normalizeHeader(grid[r]?.[c]))
      .filter(Boolean)
      .join(" ");
  }
  return labels;
}
