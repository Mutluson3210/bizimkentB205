import "server-only";
import { randomInt, createHash } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { sendSms, normalizePhone } from "./verimor";
import { buildOtpMessage } from "./messages";
import { isAdminEmail } from "@/lib/auth";

const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const PER_ACCOUNT_COOLDOWN_MS = 60 * 1000;
const PER_ACCOUNT_DAILY_CAP = 5;
const SYSTEM_DAILY_CAP = 100; // 500 SMS/ay paketinin tek günde tüketilmesini önler

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function startOfDayIso(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

/**
 * Daire No + Rol'e karşılık gelen hesabı bulur, uygunsa bir OTP üretip SMS
 * gönderir. Hesap yoksa / pasifse / telefonu yoksa / rate-limit'e takıldıysa
 * SESSİZCE hiçbir şey yapmaz (çağıran taraf her durumda aynı jenerik mesajı
 * gösterir) — bu, hesap varlığının sızmasını (enumeration) önlemek için kasıtlı.
 */
export async function requestPasswordResetOtp(daireNo: string, role: "owner" | "tenant"): Promise<void> {
  const supabase = createServiceClient();

  const { data: unit } = await supabase.from("units").select("id").eq("daire_no", daireNo).maybeSingle();
  if (!unit) return;

  const { data: account } = await supabase
    .from("accounts")
    .select("id, phone, is_active, auth_user_id")
    .eq("unit_id", unit.id)
    .eq("role", role)
    .eq("is_active", true)
    .maybeSingle();

  if (!account || !account.phone || !account.auth_user_id) return;

  // Sistem geneli günlük tavan: tek bir aktörün toplu istekle bütçeyi/telefonları spam'lemesini önler.
  const { count: systemCountToday } = await supabase
    .from("otp_codes")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startOfDayIso());
  if ((systemCountToday ?? 0) >= SYSTEM_DAILY_CAP) return;

  // Hesap başına: cooldown + günlük tavan.
  const { data: recent } = await supabase
    .from("otp_codes")
    .select("created_at")
    .eq("account_id", account.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent && Date.now() - new Date(recent.created_at).getTime() < PER_ACCOUNT_COOLDOWN_MS) return;

  const { count: accountCountToday } = await supabase
    .from("otp_codes")
    .select("*", { count: "exact", head: true })
    .eq("account_id", account.id)
    .gte("created_at", startOfDayIso());
  if ((accountCountToday ?? 0) >= PER_ACCOUNT_DAILY_CAP) return;

  // Yeni kod üretilince bu hesabın önceki tüm tüketilmemiş kodları geçersiz sayılır
  // (aksi halde aynı anda birden fazla geçerli kod, deneme-sayısı kilidini zayıflatır).
  await supabase
    .from("otp_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("account_id", account.id)
    .eq("purpose", "password_reset")
    .is("consumed_at", null);

  const code = randomInt(100000, 1000000).toString();
  await supabase.from("otp_codes").insert({
    account_id: account.id,
    code_hash: hashCode(code),
    purpose: "password_reset",
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
  });

  const result = await sendSms(account.phone, buildOtpMessage(code));
  await supabase.from("sms_log").insert({
    kind: "otp",
    account_id: account.id,
    phone: normalizePhone(account.phone),
    message: "[OTP kodu loglanmaz]",
    status: result.ok ? "sent" : "failed",
    provider_response: result.raw,
  });
}

export type ConfirmResetResult = { ok: true } | { ok: false; error: string };

export async function confirmPasswordReset(
  daireNo: string,
  role: "owner" | "tenant",
  code: string,
  newPassword: string,
): Promise<ConfirmResetResult> {
  if (newPassword.length < 6) {
    return { ok: false, error: "Şifre en az 6 karakter olmalı." };
  }

  const supabase = createServiceClient();

  const { data: unit } = await supabase.from("units").select("id").eq("daire_no", daireNo).maybeSingle();
  if (!unit) return { ok: false, error: "Kod hatalı veya süresi dolmuş." };

  const { data: account } = await supabase
    .from("accounts")
    .select("id, auth_user_id")
    .eq("unit_id", unit.id)
    .eq("role", role)
    .eq("is_active", true)
    .maybeSingle();
  if (!account || !account.auth_user_id) return { ok: false, error: "Kod hatalı veya süresi dolmuş." };

  const { data: otpRow } = await supabase
    .from("otp_codes")
    .select("id, code_hash, attempts, expires_at")
    .eq("account_id", account.id)
    .eq("purpose", "password_reset")
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otpRow || otpRow.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Kod hatalı veya süresi dolmuş." };
  }

  if (otpRow.code_hash !== hashCode(code)) {
    await supabase.from("otp_codes").update({ attempts: otpRow.attempts + 1 }).eq("id", otpRow.id);
    return { ok: false, error: "Kod hatalı veya süresi dolmuş." };
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(account.auth_user_id, {
    password: newPassword,
  });
  if (updateError) {
    return { ok: false, error: "Şifre güncellenemedi, lütfen tekrar deneyin." };
  }

  await supabase.from("otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", otpRow.id);
  return { ok: true };
}

async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const supabase = createServiceClient();
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (found) return found.id;
    if (data.users.length < 200) return null;
    page++;
  }
}

/**
 * Admin girişi için SMS OTP ile şifre sıfırlama. Admin bir `accounts` satırına
 * bağlı olmadığından (ayrı, gerçek e-posta/şifre Supabase Auth hesabı),
 * resident akışındaki gibi account_id yerine e-posta ile anahtarlanır ve tek
 * bir sabit telefon numarasına (ADMIN_PHONE) gönderilir. E-posta allowlist'te
 * değilse SESSİZCE hiçbir şey yapmaz (resident akışındaki enumeration
 * önleme kuralıyla aynı gerekçe).
 */
export async function requestAdminPasswordResetOtp(email: string): Promise<void> {
  if (!isAdminEmail(email)) return;

  const adminPhone = process.env.ADMIN_PHONE;
  if (!adminPhone) return;

  const supabase = createServiceClient();
  const normalizedEmail = email.toLowerCase();

  const { count: systemCountToday } = await supabase
    .from("otp_codes")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startOfDayIso());
  if ((systemCountToday ?? 0) >= SYSTEM_DAILY_CAP) return;

  const { data: recent } = await supabase
    .from("otp_codes")
    .select("created_at")
    .eq("email", normalizedEmail)
    .eq("purpose", "admin_password_reset")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (recent && Date.now() - new Date(recent.created_at).getTime() < PER_ACCOUNT_COOLDOWN_MS) return;

  const { count: emailCountToday } = await supabase
    .from("otp_codes")
    .select("*", { count: "exact", head: true })
    .eq("email", normalizedEmail)
    .eq("purpose", "admin_password_reset")
    .gte("created_at", startOfDayIso());
  if ((emailCountToday ?? 0) >= PER_ACCOUNT_DAILY_CAP) return;

  await supabase
    .from("otp_codes")
    .update({ consumed_at: new Date().toISOString() })
    .eq("email", normalizedEmail)
    .eq("purpose", "admin_password_reset")
    .is("consumed_at", null);

  const code = randomInt(100000, 1000000).toString();
  await supabase.from("otp_codes").insert({
    email: normalizedEmail,
    code_hash: hashCode(code),
    purpose: "admin_password_reset",
    expires_at: new Date(Date.now() + OTP_TTL_MS).toISOString(),
  });

  const result = await sendSms(adminPhone, buildOtpMessage(code));
  await supabase.from("sms_log").insert({
    kind: "otp",
    account_id: null,
    phone: normalizePhone(adminPhone),
    message: "[OTP kodu loglanmaz]",
    status: result.ok ? "sent" : "failed",
    provider_response: result.raw,
  });
}

export async function confirmAdminPasswordReset(
  email: string,
  code: string,
  newPassword: string,
): Promise<ConfirmResetResult> {
  if (newPassword.length < 6) {
    return { ok: false, error: "Şifre en az 6 karakter olmalı." };
  }
  if (!isAdminEmail(email)) {
    return { ok: false, error: "Kod hatalı veya süresi dolmuş." };
  }

  const supabase = createServiceClient();
  const normalizedEmail = email.toLowerCase();

  const { data: otpRow } = await supabase
    .from("otp_codes")
    .select("id, code_hash, attempts, expires_at")
    .eq("email", normalizedEmail)
    .eq("purpose", "admin_password_reset")
    .is("consumed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!otpRow || otpRow.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Kod hatalı veya süresi dolmuş." };
  }

  if (otpRow.code_hash !== hashCode(code)) {
    await supabase.from("otp_codes").update({ attempts: otpRow.attempts + 1 }).eq("id", otpRow.id);
    return { ok: false, error: "Kod hatalı veya süresi dolmuş." };
  }

  const authUserId = await findAuthUserIdByEmail(normalizedEmail);
  if (!authUserId) {
    return { ok: false, error: "Şifre güncellenemedi, lütfen tekrar deneyin." };
  }

  const { error: updateError } = await supabase.auth.admin.updateUserById(authUserId, {
    password: newPassword,
  });
  if (updateError) {
    return { ok: false, error: "Şifre güncellenemedi, lütfen tekrar deneyin." };
  }

  await supabase.from("otp_codes").update({ consumed_at: new Date().toISOString() }).eq("id", otpRow.id);
  return { ok: true };
}
