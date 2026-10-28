// Tek seferlik doğrulama: admin Excel yükleme server action'ını gerçek bir
// .xlsx buffer'ıyla uçtan uca çalıştırır (dönem oluşturma, parser, RLS'siz
// service-role yazma, ve aynı ayı tekrar yüklediğinde revizyon mantığı).
// Test verisi year=2030 gibi gerçek dışı bir döneme yazılır ve script sonunda
// temizlenir; gerçek sakin verisine dokunmaz.
//
// Çalıştırma: npx tsx scripts/verify-upload.ts

import { config } from "dotenv";
config({ path: ".env.local" });

import * as XLSX from "xlsx";
import { uploadPeriodAction } from "../src/app/admin/(protected)/donemler/yeni/actions";
import { createServiceClient } from "../src/lib/supabase/service";

const TEST_YEAR = 2030;
const TEST_MONTH = 1;

function buildAidatWorkbook(sicakSuA01: number): File {
  const rows = [
    ["EKİM AYI AİDAT TABLOSU - TEST", "", "", "", "", "", "", "", "EKİM AYI DEMİRBAŞ TABLOSU - TEST"],
    [
      "DAİRE NR.", "ÖNCEKİ AYDAN DEVİR", "GECİKME TAZMİNATI", "ISINMA DOĞALGAZ", "SICAK SU", "SABİT AİDAT", "TOPLAM",
      "", "ÖNCEKİ AYDAN DEVİR", "GECİKME TAZMİNATI", "", "", "TOPLAM",
    ],
    ["B2.05A-01", 0, 0, 0, sicakSuA01, 2990, 2990 + sicakSuA01, "", 100, 5, 0, 0, 105],
    ["B2.05A-02", 10, 0.5, 0, 201, 2990, 3201.5, "", 0, 0, 0, 0, 0],
    ["Demirbaş ödemeleri kural olarak kat malikine aittir."],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "TEST");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
  return new File([buf] as BlobPart[], "test-aidat.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

function buildFormData(sicakSuA01: number): FormData {
  const fd = new FormData();
  fd.set("year", String(TEST_YEAR));
  fd.set("month", String(TEST_MONTH));
  fd.append("aidatFiles", buildAidatWorkbook(sicakSuA01));
  return fd;
}

async function main() {
  console.log("1) İlk yükleme (revizyon 0 beklenir)...");
  const r1 = await uploadPeriodAction({}, buildFormData(201));
  console.log(JSON.stringify(r1, null, 2));
  if (!r1.success) throw new Error("İlk yükleme başarısız olmamalıydı.");

  console.log("\n2) Aynı ayı farklı sayılarla tekrar yükleme (revizyon 1 beklenir)...");
  const r2 = await uploadPeriodAction({}, buildFormData(999));
  console.log(JSON.stringify(r2, null, 2));
  if (!r2.success?.periodLabel.includes("Düzeltme 1")) {
    throw new Error("İkinci yükleme 'Düzeltme 1' etiketi almalıydı.");
  }

  const supabase = createServiceClient();
  const { data: periods } = await supabase
    .from("periods")
    .select("id, revision, label")
    .eq("year", TEST_YEAR)
    .eq("month", TEST_MONTH)
    .order("revision");
  console.log("\n3) Veritabanındaki test dönemleri (ikisi de ayrı ayrı durmalı):");
  console.log(periods);

  const { data: aidatRev0 } = await supabase
    .from("aidat_kayit")
    .select("sicak_su")
    .eq("period_id", periods!.find((p) => p.revision === 0)!.id)
    .limit(1)
    .single();
  console.log(
    "\n4) Revizyon 0'ın verisi hâlâ orijinal mi (sicak_su=201 olmalı, değişmemiş olmalı):",
    aidatRev0,
  );

  console.log("\nTemizleniyor: test dönemleri siliniyor...");
  await supabase.from("periods").delete().eq("year", TEST_YEAR).eq("month", TEST_MONTH);
  console.log("Tamamlandı.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
