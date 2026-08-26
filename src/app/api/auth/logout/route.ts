import { NextResponse } from "next/server";
import { DEMO_SESSION_COOKIE } from "@/lib/auth/session";
import { isDemoMode } from "@/lib/demo/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  if (!isDemoMode()) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  }
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.delete(DEMO_SESSION_COOKIE);
  return response;
}
