"use server";

import { createServiceClient } from "@/lib/supabase/service";
import { buildUnitLookup, unitLookupKey } from "@/lib/data/admin";
import { parseAidatDemirbasWorkbook, type AidatDemirbasRow } from "@/lib/excel/parseAidatDemirbas";
import { parseSicakSuWorkbook, type SicakSuRow } from "@/lib/excel/parseSicakSu";

const AY_ADLARI = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

export type UploadState = {
  error?: string;
  success?: {
    periodLabel: string;
    aidatCount: number;
    demirbasCount: number;
    sicakSuCount: number;
  };
};

async function readXlsxFiles(files: File[]): Promise<ArrayBuffer[]> {
  return Promise.all(files.map((f) => f.arrayBuffer()));
}

export async function uploadPeriodAction(
  _prevState: UploadState,
  formData: FormData,
): Promise<UploadState> {
  const year = parseInt(String(formData.get("year") ?? ""), 10);
  const month = parseInt(String(formData.get("month") ?? ""), 10);
  if (!year || !month || month < 1 || month > 12) {
    return { error: "Geçerli bir yıl ve ay seçin." };
  }

  const aidatFiles = formData
    .getAll("aidatFiles")
    .filter((f): f is File => f instanceof File && f.size > 0);
  const sicakSuFileRaw = formData.get("sicakSuFile");
  const sicakSuFile = sicakSuFileRaw instanceof File && sicakSuFileRaw.size > 0 ? sicakSuFileRaw : null;

  if (aidatFiles.length === 0 && !sicakSuFile) {
    return { error: "En az bir Aidat/Demirbaş dosyası veya Sıcak Su dosyası seçin." };
  }

  let aidatRows: AidatDemirbasRow[] = [];
  let sicakSuRows: SicakSuRow[] = [];

  try {
    const aidatBuffers = await readXlsxFiles(aidatFiles);
    aidatRows = aidatBuffers.flatMap(parseAidatDemirbasWorkbook);

    if (sicakSuFile) {
      const buf = await sicakSuFile.arrayBuffer();
      sicakSuRows = parseSicakSuWorkbook(buf);
    }
  } catch {
    return { error: "Dosyalar okunamadı. Dosyaların geçerli bir .xlsx olduğundan emin olun." };
  }

  if (aidatFiles.length > 0 && aidatRows.length === 0) {
    return { error: "Aidat/Demirbaş dosyasından hiç satır okunamadı. Sütun başlıklarını kontrol edin." };
  }
  if (sicakSuFile && sicakSuRows.length === 0) {
    return { error: "Sıcak Su dosyasından hiç satır okunamadı. Sütun başlıklarını kontrol edin." };
  }

  const lookup = await buildUnitLookup();

  const unmatched: string[] = [];
  const seenAidatKeys = new Set<string>();
  const duplicates: string[] = [];

  const resolvedAidat = aidatRows.map((row) => {
    const key = unitLookupKey(row.blockCode, row.unitNo);
    const unitId = lookup.get(key);
    if (!unitId) unmatched.push(row.daireNoRaw);
    if (seenAidatKeys.has(key)) duplicates.push(row.daireNoRaw);
    seenAidatKeys.add(key);
    return { unitId, row };
  });

  const resolvedSicakSu = sicakSuRows.map((row) => {
    const key = unitLookupKey(row.blockCode, row.unitNo);
    const unitId = lookup.get(key);
    if (!unitId) unmatched.push(row.daireNoRaw);
    return { unitId, row };
  });

  if (unmatched.length > 0) {
    return {
      error: `Şu daire numaraları sistemde bulunamadı, hiçbir şey kaydedilmedi: ${Array.from(new Set(unmatched)).join(", ")}`,
    };
  }
  if (duplicates.length > 0) {
    return {
      error: `Şu daireler yüklenen dosyalarda birden fazla kez geçiyor, hiçbir şey kaydedilmedi: ${Array.from(new Set(duplicates)).join(", ")}`,
    };
  }

  const supabase = createServiceClient();

  const { data: existingPeriods, error: periodsError } = await supabase
    .from("periods")
    .select("revision")
    .eq("year", year)
    .eq("month", month)
    .order("revision", { ascending: false })
    .limit(1);
  if (periodsError) return { error: `Dönem sorgusu başarısız: ${periodsError.message}` };

  const nextRevision = existingPeriods && existingPeriods.length > 0 ? existingPeriods[0].revision + 1 : 0;
  const label = `${AY_ADLARI[month - 1]} ${year}`;

  const { data: period, error: periodInsertError } = await supabase
    .from("periods")
    .insert({ year, month, label, revision: nextRevision, status: "published", published_at: new Date().toISOString() })
    .select("id")
    .single();
  if (periodInsertError || !period) {
    return { error: `Dönem oluşturulamadı: ${periodInsertError?.message}` };
  }
  const periodId = period.id;

  // Kısmi/tutarsız veri bırakmamak için: herhangi bir adım başarısız olursa
  // dönemi (ve cascade ile o ana kadar eklenen satırları) geri al.
  async function rollback(message: string): Promise<UploadState> {
    await supabase.from("periods").delete().eq("id", periodId);
    return { error: message };
  }

  if (resolvedAidat.length > 0) {
    const { error } = await supabase.from("aidat_kayit").insert(
      resolvedAidat.map(({ unitId, row }) => ({
        period_id: periodId,
        unit_id: unitId!,
        onceki_aydan_devir: row.aidat.devir,
        gecikme_tazminati: row.aidat.gecikme,
        isinma_dogalgaz: row.aidat.isinma,
        sicak_su: row.aidat.sicakSu,
        sabit_aidat: row.aidat.sabit,
        toplam: row.aidat.toplam,
      })),
    );
    if (error) return rollback(`Aidat kayıtları eklenemedi: ${error.message}`);

    const demirbasRows = resolvedAidat.filter(({ row }) => row.demirbas !== null);
    if (demirbasRows.length > 0) {
      const { error: demirbasError } = await supabase.from("demirbas_kayit").insert(
        demirbasRows.map(({ unitId, row }) => ({
          period_id: periodId,
          unit_id: unitId!,
          onceki_aydan_devir: row.demirbas!.devir,
          gecikme_tazminati: row.demirbas!.gecikme,
          toplam: row.demirbas!.toplam,
        })),
      );
      if (demirbasError) return rollback(`Demirbaş kayıtları eklenemedi: ${demirbasError.message}`);
    }
  }

  if (resolvedSicakSu.length > 0) {
    const { error } = await supabase.from("sicak_su_kayit").insert(
      resolvedSicakSu.map(({ unitId, row }) => ({
        period_id: periodId,
        unit_id: unitId!,
        aybasi_sayac: row.aybasiSayac,
        aysonu_sayac: row.aysonuSayac,
        kullanilan_m3: row.kullanilanM3,
        m3_fiyati: row.m3Fiyati,
        sicak_su_payi_tl: row.sicakSuPayiTl,
      })),
    );
    if (error) return rollback(`Sıcak su kayıtları eklenemedi: ${error.message}`);
  }

  return {
    success: {
      periodLabel: nextRevision > 0 ? `${label} — Düzeltme ${nextRevision}` : label,
      aidatCount: resolvedAidat.length,
      demirbasCount: resolvedAidat.filter(({ row }) => row.demirbas !== null).length,
      sicakSuCount: resolvedSicakSu.length,
    },
  };
}
