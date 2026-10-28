import "server-only";

// Verimor SMS API: POST https://sms.verimor.com.tr/v2/send.json
// Başarılı yanıt düz metin kampanya id'si; hata durumunda string kod döner
// (INSUFFICIENT_CREDITS, INVALID_DESTINATION_ADDRESS, vb).
const VERIMOR_ENDPOINT = "https://sms.verimor.com.tr/v2/send.json";

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
  const username = process.env.VERIMOR_USERNAME;
  const password = process.env.VERIMOR_PASSWORD;

  if (!username || !password) {
    return { ok: false, raw: "VERIMOR_USERNAME/VERIMOR_PASSWORD .env.local içinde tanımlı değil" };
  }

  const body: Record<string, unknown> = {
    username,
    password,
    messages: [{ dest: normalizePhone(phone), msg: message }],
  };
  if (process.env.VERIMOR_SOURCE_ADDR) {
    body.source_addr = process.env.VERIMOR_SOURCE_ADDR;
  }

  try {
    const res = await fetch(VERIMOR_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = (await res.text()).trim();

    // Başarılı yanıt sayısal bir kampanya id'si; hata yanıtları büyük harfli kod.
    const isSuccess = res.ok && /^\d+$/.test(text);
    return isSuccess ? { ok: true, raw: text } : { ok: false, raw: text || `HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, raw: err instanceof Error ? err.message : "Bilinmeyen ağ hatası" };
  }
}
