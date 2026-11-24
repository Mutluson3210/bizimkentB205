// Tek seferlik doğrulama scripti: bildirim gönderim katmanını gerçek bir
// gönderim denemesiyle sınar. Geçici, ölü bir abonelik satırı ekler; kod
// bunu temizlemezse script sonunda kendisi siler.
// Çalıştırma: npx tsx --require ./scripts/_stub-server-only.cjs scripts/verify-push.ts

import { config } from "dotenv";
import crypto from "node:crypto";

config({ path: ".env.local" });

async function main() {
  const { createServiceClient } = await import("../src/lib/supabase/service");
  const { sendPushToAll } = await import("../src/lib/push/send");
  const supabase = createServiceClient();

  console.log("--- 1) Abone yokken ---");
  console.log(await sendPushToAll({ title: "Test", body: "Test", url: "/panel/duyurular" }));

  const { data: account } = await supabase.from("accounts").select("id").limit(1).single();
  if (!account) throw new Error("Hesap bulunamadı");

  // Şifreleme adımının gerçekten çalışması için geçerli bir ECDH anahtarı
  // üretiyoruz; endpoint ise FCM'de karşılığı olmayan sahte bir adres.
  const ecdh = crypto.createECDH("prime256v1");
  ecdh.generateKeys();
  const endpoint = `https://fcm.googleapis.com/fcm/send/SAHTE-${crypto.randomUUID()}`;

  await supabase.from("push_subscriptions").insert({
    account_id: account.id,
    endpoint,
    p256dh: ecdh.getPublicKey().toString("base64url"),
    auth_secret: crypto.randomBytes(16).toString("base64url"),
    user_agent: "verify-push.ts",
  });
  console.log("\n--- 2) Ölü abonelik eklendi, gönderim deneniyor ---");

  const result = await sendPushToAll({
    title: "Su kesintisi",
    body: "Yarın 09:00-14:00 arası su verilmeyecek.",
    url: "/panel/duyurular",
  });
  console.log("sonuç:", result);

  const { count } = await supabase
    .from("push_subscriptions")
    .select("*", { count: "exact", head: true })
    .eq("endpoint", endpoint);

  console.log("satır kaldı mı:", count === 0 ? "HAYIR - otomatik temizlendi ✓" : `EVET (${count}) ✗`);

  if (count !== 0) await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);

  const { count: total } = await supabase
    .from("push_subscriptions")
    .select("*", { count: "exact", head: true });
  console.log("tabloda kalan toplam satır:", total);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
