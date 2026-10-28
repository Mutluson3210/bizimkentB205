// Çakışmayan daireler aynı aya yüklendiğinde YENİ revizyon AÇILMAMALI,
// var olan döneme eklenmeli (eksik blok tamamlama senaryosu).
import { config } from "dotenv";
config({ path: ".env.local" });

import * as XLSX from "xlsx";
import { uploadPeriodAction } from "../src/app/admin/(protected)/donemler/yeni/actions";
import { createServiceClient } from "../src/lib/supabase/service";

const TEST_YEAR = 2031;
const TEST_MONTH = 3;

function buildWorkbook(daireNo: string): File {
  const rows = [
    ["DAİRE NR.", "ÖNCEKİ AYDAN DEVİR", "GECİKME TAZMİNATI", "ISINMA DOĞALGAZ", "SICAK SU", "SABİT AİDAT", "TOPLAM"],
    [daireNo, 0, 0, 0, 100, 3000, 3100],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "T");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
  return new File([buf] as BlobPart[], "t.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

async function callAndGetRedirect(daireNo: string): Promise<string> {
  const fd = new FormData();
  fd.set("year", String(TEST_YEAR));
  fd.set("month", String(TEST_MONTH));
  fd.append("aidatFiles", buildWorkbook(daireNo));
  try {
    await uploadPeriodAction({}, fd);
    throw new Error("redirect() fırlatılmadı");
  } catch (err) {
    const digest = (err as { digest?: string }).digest;
    if (!digest?.startsWith("NEXT_REDIRECT")) throw err;
    return digest.split(";")[2];
  }
}

async function main() {
  console.log("1) B2.05A-01 yükle (yeni dönem oluşur)...");
  const r1 = await callAndGetRedirect("B2.05A-01");
  const periodId1 = r1.match(/donemler\/([^?]+)/)![1];
  console.log("period:", periodId1);

  console.log("\n2) FARKLI bir daire (B1.11-01) aynı aya yükle (ÇAKIŞMA YOK -> aynı period'a eklenmeli)...");
  const r2 = await callAndGetRedirect("B1.11-01");
  const periodId2 = r2.match(/donemler\/([^?]+)/)![1];
  console.log("period:", periodId2);

  if (periodId1 !== periodId2) {
    throw new Error(`HATA: Farklı period'lara düştü (${periodId1} vs ${periodId2}) — yeni revizyon açılmamalıydı!`);
  }
  console.log("\nDOĞRU: Aynı period_id kullanıldı, yeni revizyon açılmadı.");

  const supabase = createServiceClient();
  const { data: rows } = await supabase.from("aidat_kayit").select("unit_id").eq("period_id", periodId1);
  console.log(`period'da ${rows!.length} aidat satırı var (2 olmalı: B2.05A-01 + B1.11-01).`);

  console.log("\n3) B2.05A-01'i FARKLI sayılarla tekrar yükle (ÇAKIŞMA VAR -> yeni revizyon açılmalı)...");
  const r3 = await callAndGetRedirect("B2.05A-01");
  const periodId3 = r3.match(/donemler\/([^?]+)/)![1];
  if (periodId3 === periodId1) {
    throw new Error("HATA: Çakışma olmasına rağmen yeni revizyon açılmadı!");
  }
  console.log("DOĞRU: Yeni revizyon açıldı:", periodId3);

  console.log("\nTemizleniyor...");
  await supabase.from("periods").delete().eq("year", TEST_YEAR).eq("month", TEST_MONTH);
  console.log("Tamamlandı.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
