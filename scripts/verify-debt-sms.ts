// Borç bildirim SMS mesaj içeriğini ve tenant/owner görünürlük kuralını doğrular
// (Verimor kimlik bilgisi olmadan — gönderim 'failed' loglanır ama mesaj metni
// sms_log'a yine de yazılır, bu yeterli).
import { config } from "dotenv";
config({ path: ".env.local" });

import { sendDebtSms } from "../src/lib/sms/sendDebtSms";
import { createServiceClient } from "../src/lib/supabase/service";

const DAIRE = "B2.05A-13";

async function main() {
  const supabase = createServiceClient();
  const { data: unit } = await supabase.from("units").select("id").eq("daire_no", DAIRE).single();
  const { data: period } = await supabase
    .from("periods")
    .select("id")
    .eq("year", 2026)
    .eq("month", 10)
    .eq("revision", 0)
    .single();
  const { data: accounts } = await supabase.from("accounts").select("id, role").eq("unit_id", unit!.id);

  console.log("Gönderiliyor...");
  const summary = await sendDebtSms(
    period!.id,
    accounts!.map((a) => a.id),
  );
  console.log("Özet:", summary);

  const { data: logs } = await supabase
    .from("sms_log")
    .select("account_id, message, status")
    .eq("period_id", period!.id)
    .order("created_at", { ascending: false })
    .limit(2);

  for (const log of logs ?? []) {
    const role = accounts!.find((a) => a.id === log.account_id)?.role;
    console.log(`\n[${role}] ${log.status}:`, log.message);
    if (role === "tenant" && log.message.toLowerCase().includes("demirbas")) {
      console.error("HATA: Tenant mesajında Demirbaş geçiyor!");
      process.exitCode = 1;
    }
  }

  console.log("\nTemizleniyor...");
  await supabase.from("sms_log").delete().eq("period_id", period!.id);
  await supabase.from("accounts").update({ phone: null }).in("id", accounts!.map((a) => a.id));
  console.log("Tamamlandı.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
