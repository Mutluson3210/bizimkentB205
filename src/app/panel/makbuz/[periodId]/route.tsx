import { renderToBuffer } from "@react-pdf/renderer";
import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount, getPeriodFigures, periodLabel } from "@/lib/data/panel";
import { Receipt } from "@/lib/pdf/Receipt";

// PDF üretimi için Node çalışma zamanı gerekiyor (font gömme, buffer işlemleri) — Edge DEĞİL.
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ periodId: string }> }) {
  const { periodId } = await params;

  // BİLEREK service-role DEĞİL, mevcut oturumun RLS'ine saygılı istemci
  // kullanılıyor: demirbaş görünürlük kuralı (kiracı asla göremez) burada
  // elle tekrar yazılmıyor, veritabanı seviyesinde zaten uygulanıyor.
  const supabase = await createClient();
  const account = await getCurrentAccount(supabase);
  if (!account) {
    return new Response("Yetkisiz", { status: 401 });
  }

  const { data: period } = await supabase
    .from("periods")
    .select("id, year, month, label, revision, status")
    .eq("id", periodId)
    .eq("status", "published")
    .maybeSingle();
  if (!period) {
    return new Response("Dönem bulunamadı", { status: 404 });
  }

  const figures = await getPeriodFigures(supabase, period.id, account.unit_id);

  const buffer = await renderToBuffer(
    <Receipt
      daireNo={account.daire_no}
      blockName={account.block_name}
      roleLabel={account.role === "owner" ? "Ev Sahibi" : "Kiracı"}
      periodLabel={periodLabel(period)}
      aidat={figures.aidat}
      demirbas={figures.demirbas}
      generatedAt={new Date()}
    />,
  );

  const fileName = `makbuz-${account.daire_no}-${period.year}-${String(period.month).padStart(2, "0")}.pdf`;

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
