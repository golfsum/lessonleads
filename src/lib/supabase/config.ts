export function supabaseProjectUrl(raw = process.env.NEXT_PUBLIC_SUPABASE_URL) {
  const value = raw?.trim();
  if (!value) return "";
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

export function requireSupabaseProjectUrl() {
  const url = supabaseProjectUrl();
  if (!url) throw new Error("Supabase is not configured.");
  return url;
}
