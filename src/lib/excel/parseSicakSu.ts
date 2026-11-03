import {
  collectDataRows,
  findHeaderRows,
  normalizeHeader,
  parseDaireNo,
  parseTRNumber,
  readWorkbookSheets,
  type SheetGrid,
} from "./shared";

export type SicakSuRow = {
  blockCode: string;
  unitNo: number;
  daireNoRaw: string;
  aybasiSayac: number | null;
  aysonuSayac: number | null;
  kullanilanM3: number | null;
  m3Fiyati: number | null;
  sicakSuPayiTl: number;
};

type ColumnMap = {
  daire: number;
  aybasi?: number;
  aysonu?: number;
  kullanilanM3?: number;
  m3Fiyati?: number;
  payi?: number;
};

function detectColumns(headerRow: unknown[]): ColumnMap | null {
  let daire: number | undefined;
  const cols: ColumnMap = { daire: -1 };

  headerRow.forEach((cell, i) => {
    const h = normalizeHeader(cell);
    if (!h) return;

    if (h.includes("DAIRE")) daire = i;
    else if (h.includes("AYBASI")) cols.aybasi = i;
    else if (h.includes("AYSONU")) cols.aysonu = i;
    else if (h.includes("KULLANILAN")) cols.kullanilanM3 = i;
    else if (h.includes("FIYAT")) cols.m3Fiyati = i;
    else if (h.includes("PAYI")) cols.payi = i;
  });

  if (daire === undefined) return null;
  cols.daire = daire;
  return cols;
}

function parseHeaderBlock(grid: SheetGrid, headerRowIdx: number): SicakSuRow[] {
  const cols = detectColumns(grid[headerRowIdx] ?? []);
  if (!cols) return [];

  const dataRowIdxs = collectDataRows(grid, headerRowIdx + 1, cols.daire);

  const rows: SicakSuRow[] = [];
  for (const r of dataRowIdxs) {
    const row = grid[r] ?? [];
    const daireNoRaw = String(row[cols.daire] ?? "").trim();
    const parsed = parseDaireNo(daireNoRaw);
    if (!parsed) continue;

    rows.push({
      blockCode: parsed.blockCode,
      unitNo: parsed.unitNo,
      daireNoRaw,
      aybasiSayac: cols.aybasi !== undefined ? parseTRNumber(row[cols.aybasi]) : null,
      aysonuSayac: cols.aysonu !== undefined ? parseTRNumber(row[cols.aysonu]) : null,
      kullanilanM3: cols.kullanilanM3 !== undefined ? parseTRNumber(row[cols.kullanilanM3]) : null,
      m3Fiyati: cols.m3Fiyati !== undefined ? parseTRNumber(row[cols.m3Fiyati]) : null,
      sicakSuPayiTl: cols.payi !== undefined ? parseTRNumber(row[cols.payi]) : 0,
    });
  }

  return rows;
}

/**
 * Aidat/Demirbaş dosyasındaki gibi, bloklar (B2.05A, B2.05B, B1.11, D11)
 * tek sayfada art arda, her biri kendi başlık satırını tekrarlayarak da
 * gelebiliyor — bu yüzden sayfadaki HER başlık bloğu ayrı ayrı işlenip
 * birleştirilir (bkz. parseAidatDemirbas.ts'teki aynı düzeltme).
 */
function parseSheet(grid: SheetGrid): SicakSuRow[] {
  const headerRowIdxs = findHeaderRows(grid, "DAIRE");
  return headerRowIdxs.flatMap((idx) => parseHeaderBlock(grid, idx));
}

export function parseSicakSuWorkbook(buffer: ArrayBuffer): SicakSuRow[] {
  const sheets = readWorkbookSheets(buffer);
  return sheets.flatMap(parseSheet);
}
