import "server-only";
// web-push CommonJS paketi; Turbopack'in ESM interop'unda default export
// bulunmuyor, adlandırılmış içe aktarma şart.
import { sendNotification, setVapidDetails, WebPushError } from "web-push";
import { createServiceClient } from "@/lib/supabase/service";

export type PushPayload = {
  title: string;
  body: string;
  /** Bildirime dokununca açılacak sayfa. */
  url: string;
};

export type PushResult = {
  sent: number;
  failed: number;
  /** Tarayıcının "bu abonelik artık yok" dediği, temizlenen kayıt sayısı. */
  removed: number;
  /** Gönderim hiç denenmediyse sebebi (env eksik, abone yok). */
  skipped?: string;
};

/** VAPID anahtarları modül ömrü boyunca bir kez kurulur. */
let vapidReady: boolean | null = null;

function configureVapid(): boolean {
  if (vapidReady !== null) return vapidReady;

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    vapidReady = false;
    return false;
  }

  setVapidDetails(subject, publicKey, privateKey);
  vapidReady = true;
  return true;
}

/**
 * Kayıtlı tüm cihazlara bildirim gönderir.
 *
 * Bildirim gönderimi duyurunun kendisinden daha az önemli: burada atılan
 * hiçbir hata çağıranı patlatmaz, sonuç nesnesiyle raporlanır. Duyuru zaten
 * veritabanına yazılmış olur; bildirim gitmese de sakin panelden görür.
 */
export async function sendPushToAll(payload: PushPayload): Promise<PushResult> {
  if (!configureVapid()) {
    return { sent: 0, failed: 0, removed: 0, skipped: "VAPID anahtarları tanımlı değil" };
  }

  const supabase = createServiceClient();
  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_secret");

  if (error) {
    return { sent: 0, failed: 0, removed: 0, skipped: `Abonelikler okunamadı: ${error.message}` };
  }
  if (!subscriptions || subscriptions.length === 0) {
    return { sent: 0, failed: 0, removed: 0, skipped: "Bildirim açmış cihaz yok" };
  }

  const notification = JSON.stringify(payload);

  const results = await Promise.all(
    subscriptions.map(async (row) => {
      try {
        await sendNotification(
          {
            endpoint: row.endpoint,
            keys: { p256dh: row.p256dh, auth: row.auth_secret },
          },
          notification,
          // Cihaz kapalıysa servis 24 saat elinde tutup tekrar dener.
          { TTL: 60 * 60 * 24 },
        );
        return { endpoint: row.endpoint, status: "sent" as const };
      } catch (err) {
        // 404/410: abonelik tarayıcı tarafında silinmiş (uygulama kaldırılmış,
        // izin geri alınmış). Bu kayıtlar bir daha asla çalışmaz, temizlenir.
        const gone = err instanceof WebPushError && (err.statusCode === 404 || err.statusCode === 410);
        return { endpoint: row.endpoint, status: gone ? ("gone" as const) : ("failed" as const) };
      }
    }),
  );

  const sentEndpoints = results.filter((r) => r.status === "sent").map((r) => r.endpoint);
  const goneEndpoints = results.filter((r) => r.status === "gone").map((r) => r.endpoint);

  if (goneEndpoints.length > 0) {
    await supabase.from("push_subscriptions").delete().in("endpoint", goneEndpoints);
  }
  if (sentEndpoints.length > 0) {
    await supabase
      .from("push_subscriptions")
      .update({ last_success_at: new Date().toISOString() })
      .in("endpoint", sentEndpoints);
  }

  return {
    sent: sentEndpoints.length,
    failed: results.filter((r) => r.status === "failed").length,
    removed: goneEndpoints.length,
  };
}
