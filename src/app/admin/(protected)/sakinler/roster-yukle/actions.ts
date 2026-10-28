"use server";

import { randomBytes } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { buildUnitLookup, unitLookupKey } from "@/lib/data/admin";
import { parseRosterWorkbook } from "@/lib/excel/parseRoster";
import { parseDaireNo } from "@/lib/excel/shared";
import { syntheticEmail } from "@/lib/auth";

export type CreatedAccount = { daireNo: string; role: string; email: string; password: string };

export type RosterUploadState = {
  error?: string;
  success?: {
    created: CreatedAccount[];
    updated: number;
    warnings: string[];
  };
};

function genPassword(): string {
  return randomBytes(9).toString("base64url");
}

export async function uploadRosterAction(
  _prevState: RosterUploadState,
  formData: FormData,
): Promise<RosterUploadState> {
  const file = formData.get("rosterFile");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Bir Excel dosyası seçin." };
  }

  const { rows, warnings } = parseRosterWorkbook(await file.arrayBuffer());
  if (rows.length === 0) {
    return { error: "Dosyadan hiç satır okunamadı. Sütun başlıklarını kontrol edin." };
  }

  const lookup = await buildUnitLookup();
  const unmatched: string[] = [];
  const resolved = rows.flatMap((row) => {
    const parsed = parseDaireNo(row.daireNoRaw);
    const unitId = parsed ? lookup.get(unitLookupKey(parsed.blockCode, parsed.unitNo)) : undefined;
    if (!unitId) {
      unmatched.push(row.daireNoRaw);
      return [];
    }
    return [{ ...row, unitId }];
  });

  if (unmatched.length > 0) {
    return { error: `Şu daire numaraları sistemde bulunamadı, hiçbir şey kaydedilmedi: ${Array.from(new Set(unmatched)).join(", ")}` };
  }

  const supabase = createServiceClient();
  const created: CreatedAccount[] = [];
  let updated = 0;

  for (const row of resolved) {
    const email = syntheticEmail(row.daireNoRaw, row.role);

    const { data: existing } = await supabase
      .from("accounts")
      .select("id")
      .eq("unit_id", row.unitId)
      .eq("role", row.role)
      .eq("is_active", true)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("accounts")
        .update({ full_name: row.fullName, phone: row.phone })
        .eq("id", existing.id);
      updated += 1;
      continue;
    }

    const password = genPassword();
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (authError || !authUser.user) {
      return { error: `${row.daireNoRaw} (${row.role}) için hesap oluşturulamadı: ${authError?.message}` };
    }

    const { error: insertError } = await supabase.from("accounts").insert({
      unit_id: row.unitId,
      role: row.role,
      full_name: row.fullName,
      phone: row.phone,
      auth_user_id: authUser.user.id,
      synthetic_email: email,
    });
    if (insertError) {
      return { error: `${row.daireNoRaw} (${row.role}) hesabı kaydedilemedi: ${insertError.message}` };
    }

    created.push({ daireNo: row.daireNoRaw, role: row.role, email, password });
  }

  return {
    success: { created, updated, warnings },
  };
}
