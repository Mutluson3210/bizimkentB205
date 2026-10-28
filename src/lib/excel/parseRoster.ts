import { normalizeHeader, readWorkbookSheets, type SheetGrid } from "./shared";
import type { Role } from "@/lib/auth";

export type RosterRow = {
  daireNoRaw: string;
  fullName: string;
  phone: string | null;
  role: Role;
};

export type RosterParseResult = {
  rows: RosterRow[];
  unrecognizedRoles: string[];
};

function toRole(raw: unknown): Role | null {
  const h = normalizeHeader(raw);
  if (h.includes("KIRACI")) return "tenant";
  if (h.includes("SAHIP") || h.includes("MALIK") || h.includes("EV SAHIBI")) return "owner";
  return null;
}

type ColumnMap = { daire: number; adSoyad: number; telefon?: number; rol: number };

function detectColumns(headerRow: unknown[]): ColumnMap | null {
  let daire: number | undefined;
  let adSoyad: number | undefined;
  let telefon: number | undefined;
  let rol: number | undefined;

  headerRow.forEach((cell, i) => {
    const h = normalizeHeader(cell);
    if (!h) return;
    if (h.includes("DAIRE")) daire = i;
    else if (h.includes("AD") && h.includes("SOYAD")) adSoyad = i;
    else if (h.includes("SOYAD") || h.includes("ISIM") || h.includes("AD SOYAD")) adSoyad = i;
    else if (h.includes("TEL")) telefon = i;
    else if (h.includes("ROL")) rol = i;
  });

  if (daire === undefined || adSoyad === undefined || rol === undefined) return null;
  return { daire, adSoyad, telefon, rol };
}

function parseSheet(grid: SheetGrid, unrecognizedRoles: Set<string>): RosterRow[] {
  const headerRowIdx = grid.findIndex((row) =>
    (row ?? []).some((cell) => normalizeHeader(cell).includes("DAIRE")),
  );
  if (headerRowIdx === -1) return [];

  const cols = detectColumns(grid[headerRowIdx] ?? []);
  if (!cols) return [];

  const rows: RosterRow[] = [];
  for (let r = headerRowIdx + 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    const daireNoRaw = String(row[cols.daire] ?? "").trim();
    const fullName = String(row[cols.adSoyad] ?? "").trim();
    if (!daireNoRaw || !fullName) continue;

    const role = toRole(row[cols.rol]);
    if (!role) {
      unrecognizedRoles.add(String(row[cols.rol] ?? "").trim());
      continue;
    }

    rows.push({
      daireNoRaw,
      fullName,
      phone: cols.telefon !== undefined ? String(row[cols.telefon] ?? "").trim() || null : null,
      role,
    });
  }

  return rows;
}

export function parseRosterWorkbook(buffer: ArrayBuffer): RosterParseResult {
  const sheets = readWorkbookSheets(buffer);
  const unrecognizedRoles = new Set<string>();
  const rows = sheets.flatMap((grid) => parseSheet(grid, unrecognizedRoles));
  return { rows, unrecognizedRoles: Array.from(unrecognizedRoles) };
}
