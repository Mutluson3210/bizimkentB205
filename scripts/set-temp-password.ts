// Bir daire hesabına test amaçlı geçici şifre atar.
//
// Çalıştırma:
//   npx tsx --require ./scripts/_stub-server-only.cjs scripts/set-temp-password.ts B2.05A-01 owner
//
// Şifre .credentials/ altına yazılır (.gitignore ile korunur). Gerçek sakinin
// eski şifresi geçersiz hale gelir; test bittikten sonra sakin "Şifremi
// unuttum" (SMS OTP) ile kendi şifresini belirleyebilir.
import { config } from "dotenv";
config({ path: ".env.local" });

import { randomBytes } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { createServiceClient } from "../src/lib/supabase/service";
import { syntheticEmail, type Role } from "../src/lib/auth";

const daireNo = process.argv[2];
const role = (process.argv[3] ?? "owner") as Role;

if (!daireNo || (role !== "owner" && role !== "tenant")) {
  console.error("Kullanım: set-temp-password.ts <daireNo> <owner|tenant>");
  process.exit(1);
}

async function main() {
  const supabase = createServiceClient();

  const { data: unit, error: unitError } = await supabase
    .from("units")
    .select("id, daire_no")
    .eq("daire_no", daireNo)
    .maybeSingle();
  if (unitError) throw unitError;
  if (!unit) throw new Error(`Daire bulunamadı: ${daireNo}`);

  const { data: account, error: accError } = await supabase
    .from("accounts")
    .select("id, role, full_name, synthetic_email, auth_user_id, is_active")
    .eq("unit_id", unit.id)
    .eq("role", role)
    .maybeSingle();
  if (accError) throw accError;
  if (!account) throw new Error(`${daireNo} için ${role} hesabı yok.`);
  if (!account.auth_user_id) throw new Error(`${daireNo} ${role} hesabının auth kullanıcısı yok.`);

  const password = randomBytes(9).toString("base64url");
  const { error } = await supabase.auth.admin.updateUserById(account.auth_user_id, { password });
  if (error) throw error;

  const expectedEmail = syntheticEmail(unit.daire_no, role);
  if (expectedEmail !== account.synthetic_email) {
    console.warn(
      `[uyarı] Türetilen e-posta (${expectedEmail}) kayıttaki ile (${account.synthetic_email}) aynı değil.`,
    );
  }

  mkdirSync(".credentials", { recursive: true });
  const path = `.credentials/temp-${daireNo}-${role}-${Date.now()}.txt`;
  writeFileSync(
    path,
    `Daire: ${unit.daire_no}\nRol: ${role}\nAd: ${account.full_name}\nAktif: ${account.is_active}\n` +
      `Sentetik e-posta: ${account.synthetic_email}\nGeçici Şifre: ${password}\n` +
      `Tarih: ${new Date().toISOString()}\n`,
    "utf-8",
  );

  console.log(`[tamam] ${unit.daire_no} (${role}) için geçici şifre atandı -> ${path}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
