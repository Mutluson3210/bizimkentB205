import {
  collectDataRows,
  findHeaderRow,
  normalizeHeader,
  parseDaireNo,
  parseTRNumber,
  readWorkbookSheets,
  type SheetGrid,
} from "./shared";

export type AidatDemirbasRow = {
  blockCode: string;
  unitNo: number;
  daireNoRaw: string;
  aidat: {
    devir: number;
    gecikme: number;
    isinma: number;
    sicakSu: number;
    sabit: number;
    toplam: number;
  };
  demirbas: {
    devir: number;
    gecikme: number;
    toplam: number;
  } | null;
};

type ColumnMap = {
  daire: number;
  aidatDevir?: number;
  aidatGecikme?: number;
  aidatIsinma?: number;
  aidatSicakSu?: number;
  aidatSabit?: number;
  aidatToplam?: number;
  demirbasDevir?: number;
  demirbasGecikme?: number;
  demirbasToplam?: number;
};

function detectColumns(headerRow: unknown[]): ColumnMap | null {
  let daire: number | undefined;
  let section: "aidat" | "demirbas" = "aidat";
  const cols: ColumnMap = { daire: -1 };

  headerRow.forEach((cell, i) => {
    const h = normalizeHeader(cell);
    if (!h) return;

    if (section === "aidat") {
      if (h.includes("DAIRE")) {
        daire = i;
      } else if (h.includes("DEVIR")) {
        cols.aidatDevir = i;
      } else if (h.includes("GECIKME")) {
        cols.aidatGecikme = i;
      } else if (h.includes("ISINMA") || h.includes("DOGALGAZ")) {
        cols.aidatIsinma = i;
      } else if (h.includes("SICAK SU")) {
        cols.aidatSicakSu = i;
      } else if (h.includes("SABIT")) {
        cols.aidatSabit = i;
      } else if (h.includes("TOPLAM")) {
        cols.aidatToplam = i;
        section = "demirbas";
      }
    } else {
      if (cols.demirbasDevir === undefined && h.includes("DEVIR")) {
        cols.demirbasDevir = i;
      } else if (cols.demirbasGecikme === undefined && h.includes("GECIKME")) {
        cols.demirbasGecikme = i;
      } else if (cols.demirbasToplam === undefined && h.includes("TOPLAM")) {
        cols.demirbasToplam = i;
      }
    }
  });

  if (daire === undefined || cols.aidatToplam === undefined) return null;
  cols.daire = daire;
  return cols;
}

function parseSheet(grid: SheetGrid): AidatDemirbasRow[] {
  const headerRowIdx = findHeaderRow(grid, "DAIRE");
  if (headerRowIdx === -1) return [];

  const cols = detectColumns(grid[headerRowIdx] ?? []);
  if (!cols) return [];

  const dataRowIdxs = collectDataRows(grid, headerRowIdx + 1, cols.daire);

  const rows: AidatDemirbasRow[] = [];
  for (const r of dataRowIdxs) {
    const row = grid[r] ?? [];
    const daireNoRaw = String(row[cols.daire] ?? "").trim();
    const parsed = parseDaireNo(daireNoRaw);
    if (!parsed) continue;

    const hasDemirbas =
      cols.demirbasDevir !== undefined &&
      cols.demirbasGecikme !== undefined &&
      cols.demirbasToplam !== undefined;

    rows.push({
      blockCode: parsed.blockCode,
      unitNo: parsed.unitNo,
      daireNoRaw,
      aidat: {
        devir: parseTRNumber(cols.aidatDevir !== undefined ? row[cols.aidatDevir] : 0),
        gecikme: parseTRNumber(cols.aidatGecikme !== undefined ? row[cols.aidatGecikme] : 0),
        isinma: parseTRNumber(cols.aidatIsinma !== undefined ? row[cols.aidatIsinma] : 0),
        sicakSu: parseTRNumber(cols.aidatSicakSu !== undefined ? row[cols.aidatSicakSu] : 0),
        sabit: parseTRNumber(cols.aidatSabit !== undefined ? row[cols.aidatSabit] : 0),
        toplam: parseTRNumber(row[cols.aidatToplam!]),
      },
      demirbas: hasDemirbas
        ? {
            devir: parseTRNumber(row[cols.demirbasDevir!]),
            gecikme: parseTRNumber(row[cols.demirbasGecikme!]),
            toplam: parseTRNumber(row[cols.demirbasToplam!]),
          }
        : null,
    });
  }

  return rows;
}

export function parseAidatDemirbasWorkbook(buffer: ArrayBuffer): AidatDemirbasRow[] {
  const sheets = readWorkbookSheets(buffer);
  return sheets.flatMap(parseSheet);
}
