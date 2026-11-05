"use server";

import { redirect } from "next/navigation";
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
    .select("id, revision")
    .eq("year", year)
    .eq("month", month)
    .order("revision", { ascending: false })
    .limit(1);
  if (periodsError) return { error: `Dönem sorgusu başarısız: ${periodsError.message}` };

  const label = `${AY_ADLARI[month - 1]} ${year}`;
  const incomingAidatUnitIds = new Set(resolvedAidat.map(({ unitId }) => unitId!));
  const incomingSicakSuUnitIds = new Set(resolvedSicakSu.map(({ unitId }) => unitId!));
  const incomingUnitIds = new Set([...incomingAidatUnitIds, ...incomingSicakSuUnitIds]);

  let periodId: string;
  let periodIsNew: boolean;

  if (existingPeriods && existingPeriods.length > 0) {
    const latest = existingPeriods[0];
    // Bu yükleme, o dönemde zaten verisi olan herhangi bir daireyle çakışıyor mu?
    // Çakışmıyorsa bu bir "düzeltme" değil, eksik blokları tamamlama — var olan
    // döneme ekleriz, yeni revizyon açmayız (aksi halde diğer bloklar o yeni
    // revizyonda "veri yok" görünür). Aidat ve sıcak su AYRI veri setleri — biri
    // zaten doluyken diğerini tamamlamak da "çakışma" sayılmamalı, bu yüzden her
    // ikisi kendi tablosuna karşı ayrı ayrı kontrol edilir.
    const [{ data: existingAidatUnits }, { data: existingSicakSuUnits }] = await Promise.all([
      supabase.from("aidat_kayit").select("unit_id").eq("period_id", latest.id),
      supabase.from("sicak_su_kayit").select("unit_id").eq("period_id", latest.id),
    ]);
    const existingAidatUnitIds = new Set((existingAidatUnits ?? []).map((r) => r.unit_id));
    const existingSicakSuUnitIds = new Set((existingSicakSuUnits ?? []).map((r) => r.unit_id));
    const overlaps =
      [...incomingAidatUnitIds].some((id) => existingAidatUnitIds.has(id)) ||
      [...incomingSicakSuUnitIds].some((id) => existingSicakSuUnitIds.has(id));

    if (!overlaps) {
      periodId = latest.id;
      periodIsNew = false;
    } else {
      const { data: period, error: periodInsertError } = await supabase
        .from("periods")
        .insert({
          year,
          month,
          label,
          revision: latest.revision + 1,
          status: "published",
          published_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (periodInsertError || !period) {
        return { error: `Dönem oluşturulamadı: ${periodInsertError?.message}` };
      }
      periodId = period.id;
      periodIsNew = true;
    }
  } else {
    const { data: period, error: periodInsertError } = await supabase
      .from("periods")
      .insert({ year, month, label, revision: 0, status: "published", published_at: new Date().toISOString() })
      .select("id")
      .single();
    if (periodInsertError || !period) {
      return { error: `Dönem oluşturulamadı: ${periodInsertError?.message}` };
    }
    periodId = period.id;
    periodIsNew = true;
  }

  // Kısmi/tutarsız veri bırakmamak için: herhangi bir adım başarısız olursa geri
  // al. Dönem bu çalışmada yeni oluşturulduysa tamamını sil; var olan bir döneme
  // ekleme yapılıyorsa SADECE bu çalışmada eklenen daireleri sil — önceden var
  // olan diğer blokların verisine dokunulmaz.
  async function rollback(message: string): Promise<UploadState> {
    if (periodIsNew) {
      await supabase.from("periods").delete().eq("id", periodId);
    } else {
      const unitIds = Array.from(incomingUnitIds);
      await Promise.all([
        supabase.from("aidat_kayit").delete().eq("period_id", periodId).in("unit_id", unitIds),
        supabase.from("demirbas_kayit").delete().eq("period_id", periodId).in("unit_id", unitIds),
        supabase.from("sicak_su_kayit").delete().eq("period_id", periodId).in("unit_id", unitIds),
      ]);
    }
    return { error: message };
  }

  if (resolvedAidat.length > 0) {
    const { error } = await supabase.from("aidat_kayit").insert(
      resolvedAidat.map(({ unitId, row }) => ({
        period_id: periodId,
        unit_id: unitId!,
        devir_aidat: row.aidat.devirBorc,
        onceki_ay_tahsilati: row.aidat.tahsilat,
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
          devir_demirbas: row.demirbas!.devirBorc,
          onceki_ay_tahsilati: row.demirbas!.tahsilat,
          onceki_aydan_devir: row.demirbas!.devir,
          gecikme_tazminati: row.demirbas!.gecikme,
          yeni_kalemler: row.demirbas!.yeniKalemler,
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

  // SMS gönderimi BİLEREK bu action'ın içine gömülmüyor: dönem başarıyla commit
  // olduktan sonra, dönem detay sayfasına yönlendiriyoruz; otomatik gönderim
  // (checkbox işaretliyse) o sayfa yüklenince, DB'de zaten kesinleşmiş bir
  // periodId ile ayrı bir istek olarak tetiklenir.
  const notify = formData.get("notifySms") === "on";
  redirect(`/admin/donemler/${periodId}${notify ? "?autosend=1" : ""}`);
}
