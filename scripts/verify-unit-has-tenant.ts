// unit_has_active_tenant() RPC'sinin RLS altında (anon client + oturum) doğru
// çalıştığını doğrular: kiracılı dairede owner -> true, kiracısız dairede
// owner -> false.
import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { createServiceClient } from "../src/lib/supabase/service";
import { syntheticEmail } from "../src/lib/auth";
import type { Database } from "../src/types/database";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function checkAsOwner(daireNo: string, expected: boolean) {
  const service = createServiceClient();
  const { data: unit } = await service.from("units").select("id").eq("daire_no", daireNo).single();
  const { data: account } = await service
    .from("accounts")
    .select("auth_user_id")
    .eq("unit_id", unit!.id)
    .eq("role", "owner")
    .single();

  // Geçici, rastgele bir şifre ata (test sonrası tekrar rastgele bir şeyle değiştirilir,
  // gerçek kullanıcı şifresi hiçbir yerde loglanmaz/kalmaz).
  const tempPassword = randomBytes(9).toString("base64url");
  await service.auth.admin.updateUserById(account!.auth_user_id!, { password: tempPassword });

  const client = createClient<Database>(url, anonKey);
  const { error: signInError } = await client.auth.signInWithPassword({
    email: syntheticEmail(daireNo, "owner"),
    password: tempPassword,
  });
  if (signInError) throw signInError;

  const { data, error } = await client.rpc("unit_has_active_tenant");
  console.log(`${daireNo}: unit_has_active_tenant() = ${data} (beklenen: ${expected}) ${error ? "HATA: " + error.message : ""}`);
  if (data !== expected) {
    console.error(`  !! YANLIŞ SONUÇ`);
    process.exitCode = 1;
  }

  await client.auth.signOut();
  // Şifreyi tekrar rastgele bir değerle değiştir (geçici test şifresi kalmasın).
  await service.auth.admin.updateUserById(account!.auth_user_id!, {
    password: randomBytes(9).toString("base64url"),
  });
}

async function main() {
  await checkAsOwner("B2.05A-13", true); // kiracısı var (Özgür Özkök)
  await checkAsOwner("B2.05A-01", false); // kiracısı yok
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
