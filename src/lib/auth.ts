export type Role = "owner" | "tenant";

const SYNTHETIC_DOMAIN = process.env.SYNTHETIC_EMAIL_DOMAIN ?? "bizimkent.local";

export function normalizeDaireNo(daireNo: string): string {
  return daireNo.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Seed script'i ve login server action'ı AYNI fonksiyonu kullanmalı,
// aksi halde türetilen e-postalar eşleşmez ve giriş başarısız olur.
export function syntheticEmail(daireNo: string, role: Role): string {
  return `${normalizeDaireNo(daireNo)}-${role}@${SYNTHETIC_DOMAIN}`;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowlist = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowlist.includes(email.toLowerCase());
}
