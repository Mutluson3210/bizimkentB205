import { createClient } from "@/lib/supabase/server";
import { cardClass, linkClass } from "@/lib/ui";
import { isImageFile } from "@/lib/files";
import { MarkSeen } from "@/components/MarkSeen";

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
      <MarkSeen section="documents" />
      <h2 className="text-lg font-semibold text-foreground">Belgeler</h2>

      {withUrls.length === 0 ? (
        <p className="text-sm text-muted">Henüz hiç belge yüklenmedi.</p>
      ) : (
        <div className={`flex flex-col divide-y divide-border ${cardClass}`}>
          {withUrls.map((f) => (
            <div key={f.name} className="py-2.5">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm text-foreground">{f.name}</span>
                {f.url && (
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${linkClass} shrink-0`}
                  >
                    {isImageFile(f.name) ? "Tam boyut" : "İndir"}
                  </a>
                )}
              </div>
              {/* Resim belgeleri (ör. sıcak su hesap tablosunun ekran görüntüsü)
                  indirmeye gerek kalmadan sayfada görünsün; dokununca tam boyut
                  açılır. PDF'ler bağlantı olarak kalıyor. */}
              {f.url && isImageFile(f.name) && (
                <a href={f.url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.url}
                    alt={f.name}
                    className="max-h-80 w-full rounded-lg border border-border object-contain"
                  />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
