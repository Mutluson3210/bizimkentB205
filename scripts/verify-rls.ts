// Tek seferlik doğrulama scripti: RLS'nin UI'dan bağımsız olarak,
// veritabanı seviyesinde demirbaş verisini tenant'tan gizlediğini kanıtlar.
// Çalıştırma: npx tsx scripts/verify-rls.ts

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import { syntheticEmail } from "../src/lib/auth";
import type { Database } from "../src/types/database";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function signInAndQuery(role: "owner" | "tenant", password: string, otherUnitId: string) {
  const client = createClient<Database>(url, anonKey);
  const email = syntheticEmail("B2.05A-13", role);
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`${role} giriş hatası: ${signInError.message}`);

  const { data: unit } = await client
    .from("units")
    .select("id")
    .eq("daire_no", "B2.05A-13")
    .single();

  const { data: demirbas, error: demirbasError } = await client
    .from("demirbas_kayit")
    .select("*")
    .eq("unit_id", unit!.id);

  const { data: aidat } = await client.from("aidat_kayit").select("*").eq("unit_id", unit!.id);

  console.log(`\n--- ${role.toUpperCase()} (${email}) ---`);
  console.log("demirbas_kayit satır sayısı:", demirbas?.length ?? 0, demirbasError ? `(hata: ${demirbasError.message})` : "");
  console.log("aidat_kayit satır sayısı:", aidat?.length ?? 0);

  // Başka bir dairenin (B2.05A-01) bilinen unit_id'siyle doğrudan erişim denemesi (izolasyon testi)
  const { data: otherAidat } = await client
    .from("aidat_kayit")
    .select("*")
    .eq("unit_id", otherUnitId);
  console.log("Başka dairenin (B2.05A-01) aidat satırına erişim:", otherAidat?.length ?? 0, "(0 olmalı)");

  await client.auth.signOut();
}

async function main() {
  // Bu şifreleri .credentials/ altındaki seed çıktısından alın.
  const tenantPassword = process.argv[2];
  const ownerPassword = process.argv[3];
  if (!tenantPassword || !ownerPassword) {
    console.error("Kullanım: npx tsx scripts/verify-rls.ts <tenant_sifre> <owner_sifre>");
    process.exit(1);
  }

  const serviceClient = createClient<Database>(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: otherUnit } = await serviceClient
    .from("units")
    .select("id")
    .eq("daire_no", "B2.05A-01")
    .single();

  await signInAndQuery("tenant", tenantPassword, otherUnit!.id);
  await signInAndQuery("owner", ownerPassword, otherUnit!.id);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
