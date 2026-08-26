import { z } from "zod";
import { isDemoMode } from "@/lib/demo/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({ name: z.string().trim().min(2).max(100), email: z.email(), password: z.string().min(8).max(128) });

export async function POST(request: Request) {
  if (isDemoMode()) return Response.json({ error: "Use the fresh demo setup button in local demo mode." }, { status: 409 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter your name, a valid email, and a password of at least 8 characters." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.name },
      emailRedirectTo: new URL("/auth/callback", request.url).toString(),
    },
  });
  if (error) return Response.json({ error: error.message }, { status: 400 });
  return Response.json({ redirectTo: "/onboarding?verify=1" });
}
