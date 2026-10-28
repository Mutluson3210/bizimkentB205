import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { uploadRosterAction } from "../src/app/admin/(protected)/sakinler/roster-yukle/actions";

const path = process.argv[2];
if (!path) {
  console.error("Kullanım: node ... scripts/upload-real-roster.ts <xlsx-dosya-yolu>");
  process.exit(1);
}

async function main() {
  const buf = readFileSync(path);
  const file = new File([new Uint8Array(buf)] as BlobPart[], "roster.xlsx", {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });

  const fd = new FormData();
  fd.set("rosterFile", file);

  const result = await uploadRosterAction({}, fd);

  if (result.error) {
    console.error("HATA:", result.error);
    process.exit(1);
  }

  console.log(`${result.success!.updated} hesap güncellendi.`);
  console.log(`${result.success!.created.length} yeni hesap oluşturuldu.`);
  if (result.success!.warnings.length > 0) {
    console.log("\nUyarılar:");
    result.success!.warnings.forEach((w) => console.log(" -", w));
  }

  if (result.success!.created.length > 0) {
    mkdirSync(".credentials", { recursive: true });
    const outPath = `.credentials/roster-${Date.now()}.txt`;
    const lines = result.success!.created.map(
      (c) => `Daire: ${c.daireNo} | Rol: ${c.role} | Giriş e-postası: ${c.email} | Geçici Şifre: ${c.password}`,
    );
    writeFileSync(outPath, lines.join("\n") + "\n", "utf-8");
    console.log(`\nYeni hesapların giriş bilgileri şuraya yazıldı: ${outPath}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
