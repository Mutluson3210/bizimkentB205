import Link from "next/link";
import { getAllAnnouncements, getAnnouncementAttachmentUrl } from "@/lib/data/admin";
import { cardClass, linkClass, primaryButtonClass } from "@/lib/ui";
import { isImageFile, stripUuidPrefix } from "@/lib/files";
import { deleteAnnouncementAction } from "./actions";

export default async function DuyurularPage() {
  const announcements = await getAllAnnouncements();
  const withAttachments = await Promise.all(
    announcements.map(async (a) => ({
      ...a,
      attachmentUrl: a.attachment_path ? await getAnnouncementAttachmentUrl(a.attachment_path) : null,
    })),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Duyurular</h2>
        <Link href="/admin/duyurular/yeni" className={primaryButtonClass}>
          Yeni Duyuru
        </Link>
      </div>

      {withAttachments.length === 0 ? (
        <p className={`${cardClass} text-sm text-muted`}>Henüz hiç duyuru yayınlanmadı.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {withAttachments.map((a) => (
            <section key={a.id} className={cardClass}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-foreground">{a.title}</h3>
                  <p className="text-xs text-muted">
                    {new Date(a.created_at).toLocaleString("tr-TR")}
                  </p>
                </div>
                <form action={deleteAnnouncementAction.bind(null, a.id)}>
                  <button type="submit" className="text-xs font-medium text-brand-red hover:underline">
                    Sil
                  </button>
                </form>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{a.body}</p>
              {a.attachmentUrl && a.attachment_path && (
                <div className="mt-3">
                  {isImageFile(a.attachment_path) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.attachmentUrl} alt={a.title} className="max-h-64 rounded-lg border border-border" />
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
