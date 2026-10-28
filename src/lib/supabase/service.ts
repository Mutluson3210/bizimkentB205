import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// RLS'yi bypass eden servis-rolü istemcisi. SADECE admin server action'larında
// kullanılır (örn. Excel yükleme, hesap oluşturma). Asla tarayıcıya sızdırılmaz.
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY tanımlı değil. .env.local dosyasına Supabase " +
        "panelinden (Project Settings > API) alınan service_role anahtarını ekleyin.",
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
