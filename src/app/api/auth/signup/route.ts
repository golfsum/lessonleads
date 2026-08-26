import { z } from "zod";
import { isExistingUserError, isRecoverableCreateUserError, loginErrorMessage } from "@/lib/auth/account";
import { establishSession } from "@/lib/auth/establish-session";
import { isDemoMode } from "@/lib/demo/store";
import { sendAccountEmail } from "@/lib/email/send";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({ name: z.string().trim().min(2).max(100), email: z.email(), password: z.string().min(8).max(128) });

export async function POST(request: Request) {
  if (isDemoMode()) return Response.json({ error: "Use the fresh demo setup button in local demo mode." }, { status: 409 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter your name, a valid email, and a password of at least 8 characters." }, { status: 400 });

  const { name, email, password } = parsed.data;
  const admin = createSupabaseAdminClient();
  const created = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });
  const isNewAccount = !created.error;
  if (created.error && !isRecoverableCreateUserError(created.error)) {
    return Response.json({ error: created.error.message }, { status: 400 });
  }

  const session = await establishSession(email, password);
  if (session.error) {
    if (isExistingUserError(created.error)) {
      return Response.json({ error: "An account already exists with this email. Log in, or reset your password." }, { status: 409 });
    }
    if ((created.error?.message ?? "").toLowerCase().includes("database error saving new user")) {
      return Response.json({ error: "Your account could not be set up. The LessonLeads database tables may still need to be applied in Supabase." }, { status: 500 });
    }
    return Response.json({ error: loginErrorMessage(session.error) }, { status: 400 });
  }

  if (isNewAccount) {
    const origin = new URL(request.url).origin;
    void sendAccountEmail({
      to: email,
      kind: "welcome",
      actionUrl: `${origin}/onboarding`,
    }).catch(() => undefined);
  }

  return Response.json({ redirectTo: "/onboarding" });
}
