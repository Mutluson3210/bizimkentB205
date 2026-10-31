import { createClient } from "@/lib/supabase/server";
import { getAnnouncements } from "@/lib/data/announcements";
import { cardClass } from "@/lib/ui";

export default async function PanelDuyurularPage() {
  const supabase = await createClient();
  const announcements = await getAnnouncements(supabase);

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Duyurular</h2>

      {announcements.length === 0 ? (
        <p className="text-sm text-muted">Henüz hiç duyuru yayınlanmadı.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((a) => (
            <section key={a.id} className={cardClass}>
              <h3 className="font-semibold text-foreground">{a.title}</h3>
              <p className="text-xs text-muted">{new Date(a.created_at).toLocaleString("tr-TR")}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{a.body}</p>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
