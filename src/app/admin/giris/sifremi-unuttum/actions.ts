"use server";

import { requestAdminPasswordResetOtp, confirmAdminPasswordReset } from "@/lib/sms/otp";

export type RequestState = { sent?: boolean; error?: string };
export type ConfirmState = { success?: boolean; error?: string };

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Resident akışındaki gerekçeyle aynı: e-posta allowlist'te olsun ya da
// olmasın aynı jenerik yanıta VE aynı (en az) süreye çıkar.
const MIN_RESPONSE_MS = 800;

export async function requestResetAction(
  _prevState: RequestState,
  formData: FormData,
): Promise<RequestState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { error: "Lütfen e-posta adresinizi girin." };
  }

  await Promise.all([requestAdminPasswordResetOtp(email), delay(MIN_RESPONSE_MS)]);

  return { sent: true };
}

export async function confirmResetAction(
  _prevState: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  const email = String(formData.get("email") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim();
  const newPassword = String(formData.get("newPassword") ?? "");

  if (!email || !code || !newPassword) {
    return { error: "Tüm alanları doldurun." };
  }

  const result = await confirmAdminPasswordReset(email, code, newPassword);
  if (!result.ok) return { error: result.error };
  return { success: true };
}
