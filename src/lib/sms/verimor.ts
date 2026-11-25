import "server-only";

// SMS gönderimi, Verimor'a DOĞRUDAN değil sabit IP'li aktarıcı üzerinden yapılır
// (bkz. sms-relay/README.md). Sebebi: Verimor BTK yönergesi gereği isteklerin
// sabit bir IP'den gelmesini zorunlu tutuyor, Vercel ise sabit giden IP vermiyor.
// Verimor kullanıcı adı/şifresi bu yüzden burada DEĞİL aktarıcıda tutulur;
// Vercel'in elinde yalnızca aktarıcı token'ı vardır.
//
// Aktarıcı, Verimor'un yanıtını aynen geçirir: başarı = HTTP 200 + sayısal
// kampanya id'si, hata = string kod (INSUFFICIENT_CREDITS, vb).

const RELAY_TIMEOUT_MS = 20_000;

export type SendSmsResult = { ok: true; raw: string } | { ok: false; raw: string };

/** "0539 490 18 47" / "+905394901847" / "5394901847" -> "905394901847" */
export function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("90") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 11) return "90" + digits.slice(1);
  if (digits.length === 10) return "90" + digits;
  return digits;
}

export async function sendSms(phone: string, message: string): Promise<SendSmsResult> {
  const relayUrl = process.env.SMS_RELAY_URL;
  const relayToken = process.env.SMS_RELAY_TOKEN;

  if (!relayUrl || !relayToken) {
    return { ok: false, raw: "SMS_RELAY_URL/SMS_RELAY_TOKEN tanımlı değil" };
  }

  try {
    const res = await fetch(relayUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${relayToken}`,
      },
      body: JSON.stringify({ dest: normalizePhone(phone), msg: message }),
      // Aktarıcı düşerse serverless fonksiyon kendi süre limitine kadar
      // beklemesin; 72 dairelik gönderimde bu baştan sona kilitlenme olurdu.
      signal: AbortSignal.timeout(RELAY_TIMEOUT_MS),
    });
    const text = (await res.text()).trim();

    const isSuccess = res.ok && /^\d+$/.test(text);
    return isSuccess ? { ok: true, raw: text } : { ok: false, raw: text || `HTTP ${res.status}` };
  } catch (err) {
    const reason = err instanceof Error ? err.message : "Bilinmeyen ağ hatası";
    return { ok: false, raw: `Aktarıcıya ulaşılamadı: ${reason}` };
  }
}
