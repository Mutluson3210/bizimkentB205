"use server";

import { requestPasswordResetOtp, confirmPasswordReset } from "@/lib/sms/otp";
import type { Role } from "@/lib/auth";

export type RequestState = { sent?: boolean; error?: string };
export type ConfirmState = { success?: boolean; error?: string };

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Hesap var/yok, telefon var/yok, aktif/pasif durumları aynı jenerik yanıta VE
// aynı (en az) süreye çıkar — aksi halde yanıt süresi hesap varlığını sızdırır.
const MIN_RESPONSE_MS = 800;

export async function requestResetAction(
  _prevState: RequestState,
  formData: FormData,
): Promise<RequestState> {
  const daireNo = String(formData.get("daireNo") ?? "").trim();
  const role = String(formData.get("role") ?? "") as Role;

  if (!daireNo || (role !== "owner" && role !== "tenant")) {
    return { error: "Lütfen daire no ve rolü seçin." };
  }

  await Promise.all([requestPasswordResetOtp(daireNo, role), delay(MIN_RESPONSE_MS)]);

  return { sent: true };
}

export async function confirmResetAction(
  _prevState: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  const daireNo = String(formData.get("daireNo") ?? "").trim();
  const role = String(formData.get("role") ?? "") as Role;
  const code = String(formData.get("code") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!daireNo || (role !== "owner" && role !== "tenant") || !code || !newPassword) {
    return { error: "Tüm alanları doldurun." };
  }

  const result = await confirmPasswordReset(daireNo, role, code, newPassword);
  if (!result.ok) return { error: result.error };
  return { success: true };
}
