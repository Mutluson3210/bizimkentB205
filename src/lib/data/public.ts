import "server-only";
import { createServiceClient } from "@/lib/supabase/service";

export type PublicUnit = {
  daireNo: string;
  unitNo: number;
  blockCode: string;
  blockName: string;
};

/**
 * Sakin girişi (ve diğer herkese açık) sayfalarda blok/daire seçimi için
 * kullanılan, YALNIZCA yapısal kimlik bilgisi (blok kodu/adı + daire no)
 * döndüren herkese açık dizin. İsim/telefon gibi kişisel veri İÇERMEZ —
 * bu sayede oturum açılmadan (RLS'nin units/blocks'u authenticated'e
 * kısıtladığı durumda bile) güvenle gösterilebilir.
 */
export async function getPublicUnitDirectory(): Promise<PublicUnit[]> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.from("units").select("daire_no, unit_no, blocks(code, name)");
  if (error) throw error;

  return (data ?? [])
    .map((u) => {
      const block = u.blocks as { code: string; name: string } | null;
      return {
        daireNo: u.daire_no,
        unitNo: u.unit_no,
        blockCode: block?.code ?? "",
        blockName: block?.name ?? "",
      };
    })
    .sort((a, b) => (a.blockCode !== b.blockCode ? a.blockCode.localeCompare(b.blockCode) : a.unitNo - b.unitNo));
}
