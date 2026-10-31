import { createClient } from "@/lib/supabase/server";
import { cardClass, linkClass } from "@/lib/ui";

export default async function PanelBelgelerPage() {
  const supabase = await createClient();
  const { data: files } = await supabase.storage.from("belgeler").list("", {
    sortBy: { column: "created_at", order: "desc" },
  });

  const items = files ?? [];
  const withUrls = await Promise.all(
    items.map(async (f) => {
      const { data } = await supabase.storage.from("belgeler").createSignedUrl(f.name, 60 * 10);
      return { name: f.name, url: data?.signedUrl ?? null };
    }),
  );

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Belgeler</h2>

      {withUrls.length === 0 ? (
        <p className="text-sm text-muted">Henüz hiç belge yüklenmedi.</p>
      ) : (
        <div className={`flex flex-col divide-y divide-border ${cardClass}`}>
          {withUrls.map((f) => (
            <div key={f.name} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-foreground">{f.name}</span>
              {f.url && (
                <a href={f.url} target="_blank" rel="noopener noreferrer" className={linkClass}>
                  İndir
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
