import { z } from "zod";
import { loginErrorMessage } from "@/lib/auth/account";
import { establishSession } from "@/lib/auth/establish-session";
import { isDemoMode } from "@/lib/demo/store";

const schema = z.object({ email: z.email(), password: z.string().min(8).max(128) });

export async function POST(request: Request) {
  if (isDemoMode()) return Response.json({ error: "Use the demo workspace button in local demo mode." }, { status: 409 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a valid email and password." }, { status: 400 });
  const session = await establishSession(parsed.data.email, parsed.data.password);
  if (session.error) return Response.json({ error: loginErrorMessage(session.error) }, { status: 401 });
  return Response.json({ redirectTo: "/dashboard" });
}
