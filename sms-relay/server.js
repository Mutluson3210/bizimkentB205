"use strict";
/**
 * Bizimkent B205 SMS aktarıcısı.
 *
 * Neden var: Verimor, BTK yönergesi gereği API isteklerinin SABİT bir IP'den
 * gelmesini zorunlu tutuyor. Site Vercel'de çalışıyor ve Vercel sabit giden IP
 * vermiyor (proje başına 100 USD/ay'lık eklenti dışında). Bu aktarıcı, sabit
 * IP'li küçük bir makinede durur; Vercel ona istek atar, o Verimor'a iletir.
 *
 * Bilerek "aptal" tutuldu: mesaj metni, malik/kiracı görünürlük kuralı ve
 * sms_log kaydı Next.js tarafında (src/lib/sms/) kalır. Burada iş kuralı YOK —
 * iki yerde birbirinden sapan mesaj mantığı olmasın diye. Buraya yalnızca
 * "şu numaraya şu metni gönder" gelir.
 *
 * Verimor şifresi SADECE burada durur, Vercel'de durmaz. Vercel'in elindeki
 * RELAY_TOKEN sızsa bile Verimor hesabına doğrudan erişilemez (ve aşağıdaki
 * hız sınırları paketi boşaltmayı engeller).
 *
 * Bağımlılık yok — `node server.js` ile çalışır.
 */
const http = require("node:http");
const { timingSafeEqual, createHash } = require("node:crypto");

const VERIMOR_ENDPOINT = "https://sms.verimor.com.tr/v2/send.json";

const HOST = process.env.HOST || "127.0.0.1"; // Caddy önde; dışarıya doğrudan açılmaz.
const PORT = Number(process.env.PORT || 8080);
const MAX_BODY_BYTES = 4096;
const MAX_MSG_CHARS = 1043; // Verimor'un Türkçe karakterli mesaj üst sınırı.
const VERIMOR_TIMEOUT_MS = 20_000;

// Sızan bir token'ın 500'lük SMS paketini boşaltmasını engelleyen tavanlar.
// Aylık gönderim ~72 daire (+ nadiren OTP) olduğu için bunlar fazlasıyla geniş.
const RATE_PER_MINUTE = Number(process.env.RATE_PER_MINUTE || 100);
const RATE_PER_DAY = Number(process.env.RATE_PER_DAY || 300);

const RELAY_TOKEN = process.env.RELAY_TOKEN;
const VERIMOR_USERNAME = process.env.VERIMOR_USERNAME;
const VERIMOR_PASSWORD = process.env.VERIMOR_PASSWORD;
const VERIMOR_SOURCE_ADDR = process.env.VERIMOR_SOURCE_ADDR;

for (const [name, value] of Object.entries({
  RELAY_TOKEN,
  VERIMOR_USERNAME,
  VERIMOR_PASSWORD,
  VERIMOR_SOURCE_ADDR,
})) {
  if (!value) {
    console.error(`[fatal] ${name} tanımlı değil (/etc/sms-relay.env)`);
    process.exit(1);
  }
}

/** Sabit süreli karşılaştırma. İki tarafı da sha256'dan geçirmek uzunluk
 * sızdırmasını ve timingSafeEqual'ın farklı uzunlukta atmasını engeller. */
function tokenMatches(authHeader) {
  const prefix = "Bearer ";
  if (!authHeader || !authHeader.startsWith(prefix)) return false;
  const given = createHash("sha256").update(authHeader.slice(prefix.length)).digest();
  const expected = createHash("sha256").update(RELAY_TOKEN).digest();
  return timingSafeEqual(given, expected);
}

const sentTimestamps = [];
function rateLimitExceeded() {
  const now = Date.now();
  const dayAgo = now - 86_400_000;
  while (sentTimestamps.length && sentTimestamps[0] < dayAgo) sentTimestamps.shift();
  const lastMinute = sentTimestamps.filter((t) => t >= now - 60_000).length;
  if (lastMinute >= RATE_PER_MINUTE) return `dakikalik tavan (${RATE_PER_MINUTE})`;
  if (sentTimestamps.length >= RATE_PER_DAY) return `gunluk tavan (${RATE_PER_DAY})`;
  return null;
}

function maskPhone(dest) {
  return `${"*".repeat(Math.max(0, dest.length - 4))}${dest.slice(-4)}`;
}

function log(...args) {
  console.log(new Date().toISOString(), ...args);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

async function forwardToVerimor(dest, msg) {
  const res = await fetch(VERIMOR_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: VERIMOR_USERNAME,
      password: VERIMOR_PASSWORD,
      source_addr: VERIMOR_SOURCE_ADDR,
      // Aidat bildirimi ve şifre sıfırlama kodu ticari ileti değil; true
      // olursa İYS onayı aranır ve onaysız sakinlere gönderim engellenir.
      is_commercial: false,
      messages: [{ dest, msg }],
    }),
    signal: AbortSignal.timeout(VERIMOR_TIMEOUT_MS),
  });
  return { status: res.status, body: (await res.text()).trim() };
}

const server = http.createServer(async (req, res) => {
  const send = (status, text) => {
    res.writeHead(status, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(text);
  };

  // Kimlik doğrulaması yok: dışarıdan "ayakta mı" kontrolü için.
  // HEAD da kabul edilir — uptime izleyicilerinin çoğu (UptimeRobot dahil)
  // varsayılan olarak HEAD gönderir; yalnızca GET tanınırsa 404 görüp servisi
  // "down" sanarlar. Node, HEAD yanıtında gövdeyi kendisi kırpar.
  if ((req.method === "GET" || req.method === "HEAD") && req.url === "/health") {
    return send(200, "ok");
  }

  if (req.url !== "/send") return send(404, "not found");
  if (req.method !== "POST") return send(405, "method not allowed");

  if (!tokenMatches(req.headers.authorization)) {
    log("[401] gecersiz token");
    return send(401, "unauthorized");
  }

  let payload;
  try {
    payload = JSON.parse(await readBody(req));
  } catch {
    return send(400, "gecersiz JSON");
  }

  const dest = String(payload?.dest ?? "");
  const msg = String(payload?.msg ?? "");

  // Yalnızca Türkiye cep numaraları. Yurt dışı gönderim kat kat pahalı olduğu
  // için token sızsa bile buradan dışarıya SMS çıkmasın.
  if (!/^905\d{9}$/.test(dest)) return send(400, "gecersiz dest (905XXXXXXXXX bekleniyor)");
  if (!msg || msg.length > MAX_MSG_CHARS) return send(400, "gecersiz msg");

  const limited = rateLimitExceeded();
  if (limited) {
    log(`[429] ${limited} -> ${maskPhone(dest)}`);
    return send(429, `hiz siniri: ${limited}`);
  }

  try {
    const { status, body } = await forwardToVerimor(dest, msg);
    sentTimestamps.push(Date.now());
    log(`[${status}] ${maskPhone(dest)} ${msg.length} karakter -> ${body}`);
    // Verimor'un yanıtı aynen geçirilir: Next.js tarafı başarıyı "HTTP 200 +
    // sayısal kampanya id" olarak tanıyor, hata kodlarını da sms_log'a yazıyor.
    return send(status, body);
  } catch (err) {
    const reason = err instanceof Error ? err.message : "bilinmeyen hata";
    log(`[502] ${maskPhone(dest)} verimor'a ulasilamadi: ${reason}`);
    return send(502, `verimor'a ulasilamadi: ${reason}`);
  }
});

server.listen(PORT, HOST, () => {
  log(`sms-relay dinliyor: http://${HOST}:${PORT} (basligi: ${VERIMOR_SOURCE_ADDR})`);
});

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}
