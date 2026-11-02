import { BANKA_HESAP_ADI, IBAN } from "@/lib/constants";

export function Footer() {
  return (
    <footer className="mt-10 border-t border-border py-4 text-center text-xs text-muted">
      <p className="font-semibold text-foreground">Garanti Bankası Site Hesabı Bilgileri</p>
      <p className="mt-1">{BANKA_HESAP_ADI}</p>
      <p className="mt-0.5">IBAN: {IBAN}</p>
    </footer>
  );
}
