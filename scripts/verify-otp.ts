// OTP akışının DB/güvenlik mantığını Verimor kimlik bilgileri olmadan doğrular.
// Çalıştırma: node --require ./scripts/_stub-server-only.cjs --import tsx scripts/verify-otp.ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { createHash } from "node:crypto";
import { requestPasswordResetOtp, confirmPasswordReset } from "../src/lib/sms/otp";
import { createServiceClient } from "../src/lib/supabase/service";

const DAIRE = "B2.05A-13";
const ROLE = "owner" as const;

async function main() {
  const supabase = createServiceClient();
  const { data: unit } = await supabase.from("units").select("id").eq("daire_no", DAIRE).single();
  const { data: account } = await supabase
    .from("accounts")
    .select("id, phone")
    .eq("unit_id", unit!.id)
    .eq("role", ROLE)
    .single();
  console.log("Test hesabı:", account);

  console.log("\n1) İlk OTP isteği (Verimor kimlik bilgisi yok, SMS gönderimi 'failed' loglanmalı ama otp_codes satırı oluşmalı)...");
  await requestPasswordResetOtp(DAIRE, ROLE);
  const { count: afterFirst } = await supabase
    .from("otp_codes")
    .select("*", { count: "exact", head: true })
    .eq("account_id", account!.id);
  console.log("otp_codes satır sayısı:", afterFirst, "(>=1 olmalı)");

  console.log("\n2) Hemen tekrar istek (60sn cooldown'a takılmalı, yeni satır oluşmamalı)...");
  await requestPasswordResetOtp(DAIRE, ROLE);
  const { count: afterSecond } = await supabase
    .from("otp_codes")
    .select("*", { count: "exact", head: true })
    .eq("account_id", account!.id);
  console.log("otp_codes satır sayısı:", afterSecond, "(ilkiyle aynı olmalı:", afterFirst === afterSecond, ")");

  console.log("\n3) Bilinen bir kodu elle DB'ye yazıp confirm akışını test ediyorum...");
  const knownCode = "654321";
  await supabase
    .from("otp_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("account_id", account!.id)
    .is("consumed_at", null);
  await supabase.from("otp_codes").insert({
    account_id: account!.id,
    code_hash: createHash("sha256").update(knownCode).digest("hex"),
    purpose: "password_reset",
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });

  console.log("   Yanlış kod deneniyor...");
  const wrong = await confirmPasswordReset(DAIRE, ROLE, "000000", "YeniSifre123");
  console.log("   Sonuç (ok=false beklenir):", wrong);

  console.log("   Doğru kod deneniyor...");
  const right = await confirmPasswordReset(DAIRE, ROLE, knownCode, "YeniSifre123");
  console.log("   Sonuç (ok=true beklenir):", right);

  console.log("\n4) Var olmayan daire ile istek (sessizce hiçbir şey yapmamalı, hata fırlatmamalı)...");
  await requestPasswordResetOtp("YOK-99", ROLE);
  console.log("   Hata fırlatmadan tamamlandı: OK");

  // Temizlik: test şifresini eski haline döndürmüyoruz (seed script'teki şifre artık geçersiz,
  // gerekirse scripts/seed-accounts.ts tekrar çalıştırılıp yeni şifre alınabilir).
  console.log("\nNot: B2.05A-13 (owner) test hesabının şifresi artık 'YeniSifre123'.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
