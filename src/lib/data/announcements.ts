import type { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export async function getAnnouncements(supabase: SupabaseServer): Promise<Tables<"announcements">[]> {
  const { data } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function getAnnouncementAttachmentUrl(
  supabase: SupabaseServer,
  path: string,
): Promise<string | null> {
  const { data } = await supabase.storage.from("duyuru-ekleri").createSignedUrl(path, 60 * 10);
  return data?.signedUrl ?? null;
}
