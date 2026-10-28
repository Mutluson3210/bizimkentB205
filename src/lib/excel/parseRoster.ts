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
  warnings: string[];
};

function cleanName(raw: unknown): string {
  let s = String(raw ?? "").trim();
  if (!s) return "";
  s = s.replace(/\([^)]*\)/g, " "); // "(Denetçi)" gibi notlar
  s = s.replace(/\+?\d[\d\s\-]{6,}\d/g, " "); // isme karışmış telefon numaraları
  s = s.replace(/[-–]\s*$/, "");
  s = s.replace(/\s{2,}/g, " ").trim();
  return s;
}

function cleanPhone(raw: unknown): string | null {
  let s = String(raw ?? "").replace(/\([^)]*\)/g, "");
  // Hücrede birden fazla telefon/not " - " ile ayrılmış olabilir (ör.
  // "523 314 36 68 - 532 421 35 55") — sadece ilkini al.
  s = s.split(/\s[-–]\s/)[0];
  const match = s.match(/(\+?\d[\d\s\-]{7,}\d)/);
  if (!match) return null;
  const digits = match[1].replace(/\D/g, "");
  if (digits.length < 10) return null;
  return digits.length > 11 ? digits.slice(0, 11) : digits;
}

function namesMatch(a: string, b: string): boolean {
  const norm = (s: string) => s.toLocaleUpperCase("tr-TR").replace(/\s+/g, " ").trim();
  return norm(a) === norm(b);
}

function looksLikeRealName(s: string): boolean {
  return /[a-zA-ZğüşıöçĞÜŞİÖÇ]{2,}/.test(s);
}

// --- Şablon 1: Daire No | Ad Soyad | Telefon | Rol (Ev Sahibi/Kiracı) ---

function toRole(raw: unknown): Role | null {
  const h = normalizeHeader(raw);
  if (h.includes("KIRACI")) return "tenant";
  if (h.includes("SAHIP") || h.includes("MALIK") || h.includes("EV SAHIBI")) return "owner";
  return null;
}

type SimpleColumnMap = { daire: number; adSoyad: number; telefon?: number; rol: number };

function detectSimpleColumns(headerRow: unknown[]): SimpleColumnMap | null {
  let daire: number | undefined;
  let adSoyad: number | undefined;
  let telefon: number | undefined;
  let rol: number | undefined;

  headerRow.forEach((cell, i) => {
    const h = normalizeHeader(cell);
    if (!h) return;
    if (h.includes("DAIRE")) daire = i;
    else if (h.includes("AD") && h.includes("SOYAD")) adSoyad = i;
    else if (h.includes("SOYAD") || h.includes("ISIM")) adSoyad = i;
    else if (h.includes("TEL")) telefon = i;
    else if (h.includes("ROL")) rol = i;
  });

  if (daire === undefined || adSoyad === undefined || rol === undefined) return null;
  return { daire, adSoyad, telefon, rol };
}

function parseSimpleSheet(grid: SheetGrid, headerRowIdx: number, warnings: string[]): RosterRow[] {
  const cols = detectSimpleColumns(grid[headerRowIdx] ?? []);
  if (!cols) return [];

  const rows: RosterRow[] = [];
  for (let r = headerRowIdx + 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    const daireNoRaw = String(row[cols.daire] ?? "").trim();
    const fullName = String(row[cols.adSoyad] ?? "").trim();
    if (!daireNoRaw || !fullName) continue;

    const role = toRole(row[cols.rol]);
    if (!role) {
      warnings.push(`Tanınmayan rol değeri nedeniyle atlandı: "${row[cols.rol] ?? ""}" (${daireNoRaw})`);
      continue;
    }

    rows.push({
      daireNoRaw,
      fullName,
      phone: cols.telefon !== undefined ? cleanPhone(row[cols.telefon]) : null,
      role,
    });
  }
  return rows;
}

// --- Şablon 2: İSİM Mal Sahibi | İSİM oturan | DAİRE NR. | ... | Mal Sahibi TEL | Kiracı TEL ---
// (Yönetim şirketinin gerçek şablonu: rol sütunu yok, mal sahibi/oturan için ayrı isim+telefon
// sütunları var; "oturan" mal sahibiyle aynı kişiyse kiracı yok demektir.)

type OwnerTenantColumnMap = {
  daire: number;
  ownerName: number;
  tenantName: number;
  ownerPhone?: number;
  tenantPhone?: number;
};

function detectOwnerTenantColumns(headerRow: unknown[]): OwnerTenantColumnMap | null {
  let daire: number | undefined;
  let ownerName: number | undefined;
  let tenantName: number | undefined;
  let ownerPhone: number | undefined;
  let tenantPhone: number | undefined;

  headerRow.forEach((cell, i) => {
    const h = normalizeHeader(cell);
    if (!h) return;
    if (h.includes("DAIRE")) daire = i;
    else if (h.includes("KIRACI") && h.includes("TEL")) tenantPhone = i;
    else if ((h.includes("MAL SAHIBI") || h.includes("MALIK")) && h.includes("TEL")) ownerPhone = i;
    else if (h.includes("OTURAN")) tenantName = i;
    else if (h.includes("MAL SAHIBI") || h.includes("MALIK")) ownerName = i;
  });

  if (daire === undefined || ownerName === undefined || tenantName === undefined) return null;
  return { daire, ownerName, tenantName, ownerPhone, tenantPhone };
}

function parseOwnerTenantSheet(grid: SheetGrid, headerRowIdx: number, warnings: string[]): RosterRow[] {
  const cols = detectOwnerTenantColumns(grid[headerRowIdx] ?? []);
  if (!cols) return [];

  const rows: RosterRow[] = [];
  for (let r = headerRowIdx + 1; r < grid.length; r++) {
    const row = grid[r] ?? [];
    const daireNoRaw = String(row[cols.daire] ?? "").trim();
    if (!daireNoRaw) continue;

    const ownerName = cleanName(row[cols.ownerName]);
    const tenantNameRaw = cleanName(row[cols.tenantName]);
    const ownerPhone = cols.ownerPhone !== undefined ? cleanPhone(row[cols.ownerPhone]) : null;
    const tenantPhone = cols.tenantPhone !== undefined ? cleanPhone(row[cols.tenantPhone]) : null;

    if (!ownerName || !looksLikeRealName(ownerName)) {
      warnings.push(`${daireNoRaw}: Mal sahibi ismi okunamadı ("${row[cols.ownerName] ?? ""}"), hesap oluşturulmadı.`);
    } else {
      rows.push({ daireNoRaw, fullName: ownerName, phone: ownerPhone, role: "owner" });
    }

    const hasTenant = tenantNameRaw && looksLikeRealName(tenantNameRaw) && !namesMatch(tenantNameRaw, ownerName);
    if (hasTenant) {
      rows.push({ daireNoRaw, fullName: tenantNameRaw, phone: tenantPhone, role: "tenant" });
    }
  }
  return rows;
}

function parseSheet(grid: SheetGrid, warnings: string[]): RosterRow[] {
  const headerRowIdx = grid.findIndex((row) =>
    (row ?? []).some((cell) => normalizeHeader(cell).includes("DAIRE")),
  );
  if (headerRowIdx === -1) return [];

  const headerRow = grid[headerRowIdx] ?? [];
  const isOwnerTenantTemplate = headerRow.some((cell) => normalizeHeader(cell).includes("OTURAN"));

  return isOwnerTenantTemplate
    ? parseOwnerTenantSheet(grid, headerRowIdx, warnings)
    : parseSimpleSheet(grid, headerRowIdx, warnings);
}

export function parseRosterWorkbook(buffer: ArrayBuffer): RosterParseResult {
  const sheets = readWorkbookSheets(buffer);
  const warnings: string[] = [];
  const rows = sheets.flatMap((grid) => parseSheet(grid, warnings));
  return { rows, warnings };
}
