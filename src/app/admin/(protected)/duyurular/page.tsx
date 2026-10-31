import Link from "next/link";
import { getAllAnnouncements } from "@/lib/data/admin";
import { cardClass, primaryButtonClass } from "@/lib/ui";
import { deleteAnnouncementAction } from "./actions";

export default async function DuyurularPage() {
  const announcements = await getAllAnnouncements();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Duyurular</h2>
        <Link href="/admin/duyurular/yeni" className={primaryButtonClass}>
          Yeni Duyuru
        </Link>
      </div>

      {announcements.length === 0 ? (
        <p className={`${cardClass} text-sm text-muted`}>Henüz hiç duyuru yayınlanmadı.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {announcements.map((a) => (
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
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
