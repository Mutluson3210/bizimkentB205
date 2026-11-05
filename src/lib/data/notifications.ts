import type { createClient } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export const NOTIFY_SECTIONS = ["periods", "announcements", "documents"] as const;
export type NotifySection = (typeof NOTIFY_SECTIONS)[number];
export type UnreadCounts = Record<NotifySection, number>;

export function isNotifySection(value: string): value is NotifySection {
  return (NOTIFY_SECTIONS as readonly string[]).includes(value);
}

function countNewerThan(dates: (string | null | undefined)[], seenAt: string | undefined): number {
  const valid = dates.filter((d): d is string => Boolean(d));
  // Kaydı olmayan bölüm hiç görülmemiş sayılır: hepsi yeni.
  if (!seenAt) return valid.length;
  const seen = new Date(seenAt).getTime();
  return valid.filter((d) => new Date(d).getTime() > seen).length;
}

/**
 * Menüde gösterilecek "yeni içerik" sayıları: sakinin o bölümü son
 * görüşünden SONRA eklenen dönem / duyuru / belge sayısı. Okundu işareti
 * ilgili sayfa açıldığında `markSectionSeenAction` ile atılır.
 */
export async function getUnreadCounts(
  supabase: SupabaseServer,
  accountId: string,
): Promise<UnreadCounts> {
  const [views, periods, announcements, documents] = await Promise.all([
    supabase.from("account_views").select("section, seen_at").eq("account_id", accountId),
    supabase.from("periods").select("published_at, created_at").eq("status", "published"),
    supabase.from("announcements").select("created_at"),
    supabase.storage.from("belgeler").list("", { limit: 1000 }),
  ]);

  const seen = new Map((views.data ?? []).map((v) => [v.section, v.seen_at]));

  return {
    periods: countNewerThan(
      (periods.data ?? []).map((p) => p.published_at ?? p.created_at),
      seen.get("periods"),
    ),
    announcements: countNewerThan(
      (announcements.data ?? []).map((a) => a.created_at),
      seen.get("announcements"),
    ),
    documents: countNewerThan(
      (documents.data ?? []).map((f) => f.created_at),
      seen.get("documents"),
    ),
  };
}
