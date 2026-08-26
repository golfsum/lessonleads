import { NextResponse } from "next/server";
import { isDemoMode } from "@/lib/demo/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const form = await request.formData();
  const email = String(form.get("email") ?? "");
  if (!isDemoMode() && email) {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: new URL("/auth/update-password", request.url).toString(),
    });
  }
  return NextResponse.redirect(new URL("/login?reset=sent", request.url), 303);
}
