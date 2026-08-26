import "server-only";

import { createClient } from "@supabase/supabase-js";
import { requireSupabaseProjectUrl } from "@/lib/supabase/config";

export function createSupabaseAdminClient() {
  const url = requireSupabaseProjectUrl();
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRole) throw new Error("Supabase server credentials are not configured.");
  return createClient(url, serviceRole, { auth: { autoRefreshToken: false, persistSession: false } });
}
