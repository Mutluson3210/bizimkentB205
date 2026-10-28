// Tek seferlik, idempotent bootstrap: admin hesabı + doğrulama için iki test
// sakin hesabı (B2.05A-13: owner + tenant) oluşturur.
//
// Çalıştırmadan önce .env.local içine SUPABASE_SERVICE_ROLE_KEY'i ekleyin
// (Supabase Dashboard > Project Settings > API > service_role).
//
// Çalıştırma: npx tsx scripts/seed-accounts.ts

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { config } from "dotenv";
import { syntheticEmail } from "../src/lib/auth";
import type { Database } from "../src/types/database";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const adminEmail = (process.env.ADMIN_EMAILS ?? "").split(",")[0]?.trim();

if (!url || !serviceRoleKey || serviceRoleKey === "__DOLDURULACAK__") {
  console.error(
    "Hata: .env.local içinde NEXT_PUBLIC_SUPABASE_URL ve gerçek bir SUPABASE_SERVICE_ROLE_KEY olmalı.",
  );
  process.exit(1);
}

const supabase = createClient<Database>(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function genPassword(): string {
  return randomBytes(9).toString("base64url");
}

const credentials: string[] = [];

async function ensureAuthUser(email: string): Promise<{ id: string; password?: string }> {
  const password = genPassword();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (!error && data.user) {
    return { id: data.user.id, password };
  }

  // Zaten varsa (idempotent tekrar çalıştırma), mevcut kullanıcıyı bul.
  if (error?.message?.toLowerCase().includes("already")) {
    let page = 1;
    while (true) {
      const { data: list, error: listError } = await supabase.auth.admin.listUsers({
        page,
        perPage: 200,
      });
      if (listError) throw listError;
      const found = list.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
      if (found) return { id: found.id };
      if (list.users.length < 200) break;
      page += 1;
    }
  }

  throw error ?? new Error(`${email} için kullanıcı oluşturulamadı/bulunamadı.`);
}

async function ensureAccount(opts: {
  daireNo: string;
  role: "owner" | "tenant";
  fullName: string;
  phone?: string;
}) {
  const email = syntheticEmail(opts.daireNo, opts.role);
  const { data: unit } = await supabase
    .from("units")
    .select("id")
    .eq("daire_no", opts.daireNo)
    .single();
  if (!unit) throw new Error(`Daire bulunamadı: ${opts.daireNo}`);

  const { data: existing } = await supabase
    .from("accounts")
    .select("id")
    .eq("synthetic_email", email)
    .maybeSingle();

  if (existing) {
    console.log(`[atlandı] ${email} için hesap zaten var.`);
    return;
  }

  const { id: authUserId, password } = await ensureAuthUser(email);

  const { error } = await supabase.from("accounts").insert({
    unit_id: unit.id,
    role: opts.role,
    full_name: opts.fullName,
    phone: opts.phone ?? null,
    auth_user_id: authUserId,
    synthetic_email: email,
  });
  if (error) throw error;

  console.log(`[oluşturuldu] ${opts.daireNo} (${opts.role}) -> ${email}`);
  if (password) {
    credentials.push(
      `Daire: ${opts.daireNo} | Rol: ${opts.role} | Şifre giriş e-postası (otomatik): ${email} | Geçici Şifre: ${password}`,
    );
  }
}

async function ensureAdmin() {
  if (!adminEmail) {
    console.log("[uyarı] ADMIN_EMAILS tanımlı değil, admin hesabı oluşturulmadı.");
    return;
  }
  const { password } = await ensureAuthUser(adminEmail);
  if (password) {
    console.log(`[oluşturuldu] Admin hesabı -> ${adminEmail}`);
    credentials.push(`ADMIN | E-posta: ${adminEmail} | Geçici Şifre: ${password}`);
  } else {
    console.log(`[atlandı] Admin hesabı zaten var: ${adminEmail}`);
  }
}

async function main() {
  await ensureAdmin();

  // Doğrulama planı: B2.05A-13 gerçek demirbaşı olan bir daire -> owner + tenant
  await ensureAccount({
    daireNo: "B2.05A-13",
    role: "owner",
    fullName: "Test Ev Sahibi (B2.05A-13)",
  });
  await ensureAccount({
    daireNo: "B2.05A-13",
    role: "tenant",
    fullName: "Test Kiracı (B2.05A-13)",
  });

  if (credentials.length > 0) {
    mkdirSync(".credentials", { recursive: true });
    const path = `.credentials/seed-${Date.now()}.txt`;
    writeFileSync(path, credentials.join("\n") + "\n", "utf-8");
    console.log(`\nGiriş bilgileri şuraya yazıldı: ${path}`);
    console.log("Bu dosya .gitignore ile korunur, asla paylaşmayın/commit etmeyin.");
  } else {
    console.log("\nYeni kullanıcı oluşturulmadı (hepsi zaten mevcuttu).");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
