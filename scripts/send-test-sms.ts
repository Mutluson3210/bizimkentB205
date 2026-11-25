// Tek bir daireye gerçek borç bildirim SMS'i gönderir (canlı test).
// Kullanım: npm run sms:test -- B2.05B-35
// Dönem verilmezse en son yayınlanan dönem kullanılır.
//
// verify-debt-sms.ts ile farkı: o script metni/görünürlük kuralını doğrular ve
// sonrasında sms_log'u temizler; bu script gerçekten gönderir ve kaydı BIRAKIR
// (sağlayıcı yanıtı incelenebilsin diye).
import { config } from "dotenv";
config({ path: ".env.local" });

import { sendDebtSms } from "../src/lib/sms/sendDebtSms";
import { createServiceClient } from "../src/lib/supabase/service";

const DEFAULT_DAIRE = "B2.05B-35";

function maskPhone(phone: string | null): string {
  if (!phone) return "-";
  const digits = phone.replace(/\D/g, "");
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

async function main() {
  const daireNo = process.argv[2] ?? DEFAULT_DAIRE;

  const missing = ["SMS_RELAY_URL", "SMS_RELAY_TOKEN"].filter((k) => !process.env[k]);
  if (missing.length) {
    console.error(`.env.local içinde tanımlı değil: ${missing.join(", ")} — gerçek gönderim yapılamaz.`);
    process.exit(1);
  }

  const supabase = createServiceClient();

  const { data: unit } = await supabase.from("units").select("id, daire_no").eq("daire_no", daireNo).maybeSingle();
  if (!unit) {
    console.error(`Daire bulunamadı: ${daireNo}`);
    process.exit(1);
  }

  const { data: period } = await supabase
    .from("periods")
    .select("id, label, status")
    .eq("status", "published")
    .order("year", { ascending: false })
    .order("month", { ascending: false })
    .order("revision", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!period) {
    console.error("Yayınlanmış dönem yok.");
    process.exit(1);
  }

  const { data: accounts } = await supabase
    .from("accounts")
    .select("id, role, phone")
    .eq("unit_id", unit.id)
    .eq("is_active", true)
    .not("phone", "is", null);

  if (!accounts?.length) {
    console.error(`${daireNo} için telefonu tanımlı aktif hesap yok.`);
    process.exit(1);
  }

  console.log(`Daire: ${unit.daire_no}  Dönem: ${period.label}`);
  for (const a of accounts) console.log(`  -> ${a.role} ${maskPhone(a.phone)}`);

  const summary = await sendDebtSms(
    period.id,
    accounts.map((a) => a.id),
  );
  console.log("Özet:", summary);

  const { data: logs } = await supabase
    .from("sms_log")
    .select("account_id, phone, message, status, provider_response")
    .eq("period_id", period.id)
    .in("account_id", accounts.map((a) => a.id))
    .order("created_at", { ascending: false })
    .limit(accounts.length);

  for (const log of logs ?? []) {
    const role = accounts.find((a) => a.id === log.account_id)?.role;
    console.log(`\n[${role}] ${log.status} (${log.provider_response})`);
    console.log(`${maskPhone(log.phone)}: ${log.message}`);
    console.log(`${log.message.length} karakter`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
