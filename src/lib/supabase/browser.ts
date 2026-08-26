"use client";

import { createBrowserClient } from "@supabase/ssr";
import { requireSupabaseProjectUrl } from "@/lib/supabase/config";

export function createSupabaseBrowserClient() {
  const url = requireSupabaseProjectUrl();
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key) throw new Error("Supabase is not configured.");
  return createBrowserClient(url, key);
}
