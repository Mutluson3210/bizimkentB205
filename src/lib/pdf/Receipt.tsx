import "server-only";
import path from "node:path";
import { Document, Page, Text, View, Font, StyleSheet } from "@react-pdf/renderer";
import type { Tables } from "@/types/database";

Font.register({
  family: "NotoSans",
  src: path.join(process.cwd(), "src/assets/fonts/NotoSans.ttf"),
});

const BANKA_HESAP_ADI = "BİZİMKENT TOPLU KONUTLARI B-2 05-B1-11 D11 BLOK YÖNETİMİ";
const IBAN = "TR70 0006 2000 7820 0006 2998 72";

const styles = StyleSheet.create({
  page: { fontFamily: "NotoSans", padding: 36, fontSize: 11, color: "#16213e" },
  header: { marginBottom: 16, borderBottom: "2 solid #173f78", paddingBottom: 10 },
  title: { fontSize: 18, fontWeight: 700, color: "#173f78" },
  subtitle: { fontSize: 11, color: "#64748b", marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: 700, marginTop: 16, marginBottom: 6, color: "#173f78" },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  rowLabel: { color: "#64748b" },
  rowValue: { fontWeight: 400 },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "#e8eef7",
    fontWeight: 700,
  },
  genelToplam: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    padding: 10,
    backgroundColor: "#173f78",
    color: "#ffffff",
    fontSize: 13,
    fontWeight: 700,
  },
  footer: { marginTop: 28, paddingTop: 10, borderTop: "1 solid #e3e7ee", fontSize: 9, color: "#64748b", textAlign: "center" },
});

function formatTlPdf(value: number | null | undefined): string {
  const formatted = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2 }).format(value ?? 0);
  return `${formatted} TL`;
}

export function Receipt({
  daireNo,
  blockName,
  roleLabel,
  periodLabel,
  aidat,
  demirbas,
  generatedAt,
}: {
  daireNo: string;
  blockName: string;
  roleLabel: string;
  periodLabel: string;
  aidat: Tables<"aidat_kayit"> | null;
  demirbas: Tables<"demirbas_kayit"> | null;
  generatedAt: Date;
}) {
  const genelToplam = aidat && demirbas ? aidat.toplam + demirbas.toplam : null;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Bizimkent B205 — Borç Makbuzu</Text>
          <Text style={styles.subtitle}>
            {blockName} · {daireNo} · {roleLabel}
          </Text>
          <Text style={styles.subtitle}>{periodLabel}</Text>
        </View>

        <Text style={styles.sectionTitle}>Aidat</Text>
        {aidat ? (
          <View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Önceki Aydan Devir</Text>
              <Text style={styles.rowValue}>{formatTlPdf(aidat.onceki_aydan_devir)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Gecikme Tazminatı</Text>
              <Text style={styles.rowValue}>{formatTlPdf(aidat.gecikme_tazminati)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Isınma / Doğalgaz</Text>
              <Text style={styles.rowValue}>{formatTlPdf(aidat.isinma_dogalgaz)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Sıcak Su</Text>
              <Text style={styles.rowValue}>{formatTlPdf(aidat.sicak_su)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Sabit Aidat</Text>
              <Text style={styles.rowValue}>{formatTlPdf(aidat.sabit_aidat)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>Toplam</Text>
              <Text>{formatTlPdf(aidat.toplam)}</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.rowLabel}>Bu dönem için aidat verisi girilmedi.</Text>
        )}

        {/* Demirbaş bölümü SADECE `demirbas` null değilse render edilir — bu veri
            buraya RLS'ye saygılı bir sorgudan geliyor, yani tenant için zaten
            null gelir ve bu bölüm hiç görünmez (demirbaş görünürlük kuralı
            veritabanı seviyesinde, burada elle tekrarlanmıyor). */}
        {demirbas && (
          <View>
            <Text style={styles.sectionTitle}>Demirbaş (Ev Sahibine Aittir)</Text>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Önceki Aydan Devir</Text>
              <Text style={styles.rowValue}>{formatTlPdf(demirbas.onceki_aydan_devir)}</Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Gecikme Tazminatı</Text>
              <Text style={styles.rowValue}>{formatTlPdf(demirbas.gecikme_tazminati)}</Text>
            </View>
            <View style={styles.totalRow}>
              <Text>Toplam</Text>
              <Text>{formatTlPdf(demirbas.toplam)}</Text>
            </View>
          </View>
        )}

        {genelToplam !== null && (
          <View style={styles.genelToplam}>
            <Text>Genel Toplam (Aidat + Demirbaş)</Text>
            <Text>{formatTlPdf(genelToplam)}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text style={{ fontWeight: 700, color: "#16213e" }}>Garanti Bankası Site Hesabı Bilgileri</Text>
          <Text style={{ marginTop: 2 }}>{BANKA_HESAP_ADI}</Text>
          <Text>IBAN: {IBAN}</Text>
          <Text style={{ marginTop: 4 }}>
            Bu makbuz {generatedAt.toLocaleString("tr-TR")} tarihinde otomatik oluşturulmuştur.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
