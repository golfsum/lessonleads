import "server-only";

import { ensureUserWorkspace } from "@/lib/data/provision";
import { isUnconfirmedAuthError } from "@/lib/auth/account";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

async function confirmUserEmail(email: string) {
  const admin = createSupabaseAdminClient();
  const normalized = email.toLowerCase();
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const user = data.users.find((entry) => entry.email?.toLowerCase() === normalized);
    if (user) {
      if (!user.email_confirmed_at) {
        const { error: confirmError } = await admin.auth.admin.updateUserById(user.id, { email_confirm: true });
        if (confirmError) throw new Error(confirmError.message);
      }
      return user;
    }
    if (data.users.length < 200) break;
  }
  throw new Error("Could not find that account.");
}

export async function establishSession(email: string, password: string) {
  const supabase = await createSupabaseServerClient();
  let { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error && isUnconfirmedAuthError(error)) {
    await confirmUserEmail(email);
    ({ error } = await supabase.auth.signInWithPassword({ email, password }));
  }
  if (error) return { user: null, error };
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return { user: null, error: userError ?? new Error("Could not start your session.") };
  try {
    await ensureUserWorkspace(user);
  } catch (provisionError) {
    return {
      user: null,
      error: provisionError instanceof Error ? provisionError : new Error("Could not create your workspace."),
    };
  }
  return { user, error: null };
}
