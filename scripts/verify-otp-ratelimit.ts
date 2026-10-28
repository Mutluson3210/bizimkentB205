import { config } from "dotenv";
config({ path: ".env.local" });

import { requestPasswordResetOtp } from "../src/lib/sms/otp";
import { createServiceClient } from "../src/lib/supabase/service";

const DAIRE = "B2.05A-13";
const ROLE = "owner" as const;

async function countRows(accountId: string) {
  const supabase = createServiceClient();
  const { count } = await supabase
    .from("otp_codes")
    .select("*", { count: "exact", head: true })
    .eq("account_id", accountId);
  return count ?? 0;
}

async function main() {
  const supabase = createServiceClient();
  const { data: unit } = await supabase.from("units").select("id").eq("daire_no", DAIRE).single();
  const { data: account } = await supabase
    .from("accounts")
    .select("id, phone")
    .eq("unit_id", unit!.id)
    .eq("role", ROLE)
    .single();
  console.log("Telefon:", account!.phone);

  console.log("\n1. istek...");
  await requestPasswordResetOtp(DAIRE, ROLE);
  console.log("satır sayısı:", await countRows(account!.id));

  console.log("\n2. istek (hemen ardından, cooldown'a takılmalı)...");
  await requestPasswordResetOtp(DAIRE, ROLE);
  console.log("satır sayısı (aynı kalmalı):", await countRows(account!.id));

  console.log("\nOTP kayıtlarını temizliyorum (test artığı)...");
  await supabase.from("otp_codes").delete().eq("account_id", account!.id);
  await supabase.from("sms_log").delete().eq("account_id", account!.id).eq("kind", "otp");
  console.log("Tamamlandı.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
