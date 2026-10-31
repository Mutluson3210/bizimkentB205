import { createServiceClient } from "@/lib/supabase/service";
import { cardClass } from "@/lib/ui";
import { UploadForm } from "./UploadForm";
import { deleteDocumentAction } from "./actions";

export default async function BelgelerPage() {
  const supabase = createServiceClient();
  const { data: files } = await supabase.storage.from("belgeler").list("", {
    sortBy: { column: "created_at", order: "desc" },
  });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Belgeler</h2>
      <p className="text-sm text-muted">
        Burada yüklediğiniz dosyalar tüm sakinlerin panelinde görünür ve indirilebilir (yönetim
        planı, genel kurul kararları vb.). Dosya adı sakinlere olduğu gibi gösterilir — anlamlı bir
        isimle yükleyin.
      </p>

      <UploadForm />

      {!files || files.length === 0 ? (
        <p className={`${cardClass} text-sm text-muted`}>Henüz hiç belge yüklenmedi.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <table className="w-full border-separate border-spacing-x-4 text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="border-b border-border py-3 pl-4">Dosya</th>
                <th className="border-b border-border">Yüklenme Tarihi</th>
                <th className="border-b border-border pr-4"></th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.name}>
                  <td className="border-b border-border py-3 pl-4 font-medium text-foreground">{f.name}</td>
                  <td className="border-b border-border text-muted">
                    {f.created_at ? new Date(f.created_at).toLocaleDateString("tr-TR") : "-"}
                  </td>
                  <td className="border-b border-border pr-4">
                    <form action={deleteDocumentAction.bind(null, f.name)}>
                      <button type="submit" className="text-xs font-medium text-brand-red hover:underline">
                        Sil
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
