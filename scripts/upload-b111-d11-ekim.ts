import { config } from "dotenv";
config({ path: ".env.local" });

import * as XLSX from "xlsx";
import { uploadPeriodAction } from "../src/app/admin/(protected)/donemler/yeni/actions";
import { createServiceClient } from "../src/lib/supabase/service";

type Row = [string, number, number, number, number, number, number, number, number, number];
// [daire, devir, gecikme, isinma, sicakSu, sabit, toplam, demDevir, demGecikme, demToplam]

const B111: Row[] = [
  ["B1.11-01", 3357.10, 167.86, 0, 603, 2990, 7117.96, 0, 0, 0],
  ["B1.11-02", 0, 0, 0, 402, 2990, 3392.00, 0, 0, 0],
  ["B1.11-03", 0, 0, 0, 603, 3045, 3648.00, 0, 0, 0],
  ["B1.11-04", 0, 0, 0, 201, 3045, 3246.00, 0, 0, 0],
  ["B1.11-05", 16842.74, 842.14, 0, 1407, 3045, 22136.88, 0, 0, 0],
  ["B1.11-06", 8028.53, 401.43, 0, 1005, 3045, 12479.96, 2308.85, 115.44, 2424.29],
  ["B1.11-07", 0, 0, 0, 804, 3045, 3849.00, 0, 0, 0],
  ["B1.11-08", 0, 0, 0, 402, 3045, 3447.00, 0, 0, 0],
  ["B1.11-09", -490.57, 0, 0, 201, 3045, 2755.43, 0, 0, 0],
  ["B1.11-10", -36.25, 0, 0, 1206, 3045, 4214.75, 0, 0, 0],
  ["B1.11-11", -0.15, 0, 0, 201, 3045, 3245.85, 0, 0, 0],
  ["B1.11-12", -10.83, 0, 0, 603, 3045, 3637.17, 0, 0, 0],
  ["B1.11-13", 0, 0, 0, 1005, 3045, 4050.00, 0, 0, 0],
  ["B1.11-14", -0.37, 0, 0, 201, 3045, 3245.63, 0, 0, 0],
  ["B1.11-15", 0, 0, 0, 0, 3045, 3045.00, 0, 0, 0],
  ["B1.11-16", -23.10, 0, 0, 201, 3045, 3222.90, 0, 0, 0],
  ["B1.11-17", 0, 0, 0, 402, 3045, 3447.00, 0, 0, 0],
  ["B1.11-18", 3830.75, 191.54, 0, 402, 3045, 7469.29, 0, 0, 0],
];

const D11: Row[] = [
  ["D11-1", -67.00, 0, 0, 0, 2435, 2368.00, 0, 0, 0],
  ["D11-2", 1.16, 0.06, 0, 402, 2435, 2838.22, 0, 0, 0],
  ["D11-3", 0, 0, 0, 0, 2490, 2490.00, 0, 0, 0],
  ["D11-4", -0.59, 0, 0, 201, 2490, 2690.41, 0, 0, 0],
  ["D11-5", -185.53, 0, 0, 201, 2490, 2505.47, 0, 0, 0],
  ["D11-6", 0, 0, 0, 0, 2490, 2490.00, 555.56, 27.78, 583.34],
  ["D11-7", 2396.86, 119.84, 0, 201, 2490, 5207.70, 555.56, 27.78, 583.34],
  ["D11-8", 0, 0, 0, 0, 2490, 2490.00, 0, 0, 0],
  ["D11-9", -1.97, 0, 0, 603, 2490, 3091.03, 0, 0, 0],
  ["D11-10", 7559.25, 377.96, 0, 0, 2490, 10427.21, 555.56, 27.78, 583.34],
  ["D11-11", 2645.95, 132.30, 0, 201, 2490, 5469.25, 0, 0, 0],
  ["D11-12", 0, 0, 0, 201, 2490, 2691.00, 1236.32, 61.82, 1298.14],
  ["D11-13", 0, 0, 0, 201, 2490, 2691.00, 0, 0, 0],
  ["D11-14", 9540.91, 477.05, 0, 804, 2490, 13311.96, 0, 0, 0],
  ["D11-15", -1.16, 0, 0, 0, 2490, 2488.84, 0, 0, 0],
  ["D11-16", -0.96, 0, 0, 0, 2490, 2489.04, 3567.93, 178.40, 3746.33],
  ["D11-17", 11570.76, 578.54, 0, 0, 2490, 14639.30, 0, 0, 0],
  ["D11-18", 2848.26, 142.41, 0, 201, 2490, 5681.67, 2040.39, 102.02, 2142.41],
];

function buildWorkbook(rows: Row[]): File {
  const header = [
    "DAİRE NR.", "ÖNCEKİ AYDAN DEVİR", "GECİKME TAZMİNATI", "ISINMA DOĞALGAZ", "SICAK SU", "SABİT AİDAT", "TOPLAM",
    "", "ÖNCEKİ AYDAN DEVİR", "GECİKME TAZMİNATI", "", "", "TOPLAM",
  ];
  const aoa = [
    header,
    ...rows.map((r) => [r[0], r[1], r[2], r[3], r[4], r[5], r[6], "", r[7], r[8], 0, 0, r[9]]),
  ];
  const sheet = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, sheet, "T");
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as Uint8Array;
  return new File([buf] as BlobPart[], "ekim.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

async function upload(rows: Row[], label: string) {
  const fd = new FormData();
  fd.set("year", "2026");
  fd.set("month", "10");
  fd.append("aidatFiles", buildWorkbook(rows));
  try {
    await uploadPeriodAction({}, fd);
    throw new Error("redirect() beklenirken fırlatılmadı");
  } catch (err) {
    const digest = (err as { digest?: string }).digest;
    if (!digest?.startsWith("NEXT_REDIRECT")) throw err;
    const path = digest.split(";")[2];
    console.log(`${label} yüklendi -> ${path}`);
    return path;
  }
}

async function main() {
  await upload(B111, "B1.11");
  const finalPath = await upload(D11, "D11");

  const periodId = finalPath.match(/donemler\/([^?]+)/)![1];
  const supabase = createServiceClient();
  const { count: aidatCount } = await supabase
    .from("aidat_kayit")
    .select("*", { count: "exact", head: true })
    .eq("period_id", periodId);
  const { count: demirbasCount } = await supabase
    .from("demirbas_kayit")
    .select("*", { count: "exact", head: true })
    .eq("period_id", periodId);
  console.log(`\nSonuç: period ${periodId} -> aidat ${aidatCount}/72, demirbaş ${demirbasCount}/72`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
