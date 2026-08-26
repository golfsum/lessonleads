import { z } from "zod";
import { isDemoMode } from "@/lib/demo/store";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const schema = z.object({ email: z.email(), password: z.string().min(8).max(128) });

export async function POST(request: Request) {
  if (isDemoMode()) return Response.json({ error: "Use the demo workspace button in local demo mode." }, { status: 409 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a valid email and password." }, { status: 400 });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
  return Response.json({ redirectTo: "/dashboard" });
}
