import { createClient } from "@/lib/supabase/server";
import { getAnnouncements, getAnnouncementAttachmentUrl } from "@/lib/data/announcements";
import { cardClass, linkClass } from "@/lib/ui";
import { isImageFile, stripUuidPrefix } from "@/lib/files";
import { MarkSeen } from "@/components/MarkSeen";

export default async function PanelDuyurularPage() {
  const supabase = await createClient();
  const announcements = await getAnnouncements(supabase);
  const withAttachments = await Promise.all(
    announcements.map(async (a) => ({
      ...a,
      attachmentUrl: a.attachment_path ? await getAnnouncementAttachmentUrl(supabase, a.attachment_path) : null,
    })),
  );

  return (
    <div className="flex flex-col gap-4">
      <MarkSeen section="announcements" />
      <h2 className="text-lg font-semibold text-foreground">Duyurular</h2>

      {withAttachments.length === 0 ? (
        <p className="text-sm text-muted">Henüz hiç duyuru yayınlanmadı.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {withAttachments.map((a) => (
            <section key={a.id} className={cardClass}>
              <h3 className="font-semibold text-foreground">{a.title}</h3>
              <p className="text-xs text-muted">{new Date(a.created_at).toLocaleString("tr-TR")}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{a.body}</p>
              {a.attachmentUrl && a.attachment_path && (
                <div className="mt-3">
                  {isImageFile(a.attachment_path) ? (
                    <a href={a.attachmentUrl} target="_blank" rel="noopener noreferrer" className="block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.attachmentUrl}
                        alt={a.title}
                        className="max-h-80 w-full rounded-lg border border-border object-contain"
                      />
                    </a>
                  ) : (
                    <a href={a.attachmentUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
                      📎 {stripUuidPrefix(a.attachment_path)}
                    </a>
                  )}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
