import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isDemoMode } from "@/lib/demo/store";
import { ensureUserWorkspace } from "@/lib/data/provision";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const DEMO_SESSION_COOKIE = "lessonleads_demo_session";

export interface Viewer {
  id: string;
  email: string;
  name: string;
  organizationId: string;
  role: "owner" | "admin" | "member";
  demo: boolean;
}

export async function getViewer(): Promise<Viewer | null> {
  if (isDemoMode()) {
    const cookieStore = await cookies();
    if (cookieStore.get(DEMO_SESSION_COOKIE)?.value !== "coach_mike_smith") return null;
    return { id: "user_demo_mike", email: "mike@example.com", name: "Mike Smith", organizationId: "org_desert_fairways", role: "owner", demo: true };
  }

  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  let { data: membership } = await supabase.from("organization_members").select("organization_id, role").eq("user_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
  if (!membership) {
    try {
      await ensureUserWorkspace(user);
      const retry = await supabase.from("organization_members").select("organization_id, role").eq("user_id", user.id).order("created_at", { ascending: true }).limit(1).maybeSingle();
      membership = retry.data;
    } catch {
      return null;
    }
  }
  if (!membership) return null;
  return {
    id: user.id,
    email: user.email ?? "",
    name: String(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Coach"),
    organizationId: membership.organization_id,
    role: membership.role,
    demo: false,
  };
}

export async function requireViewer() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

export async function requireAdmin() {
  const viewer = await requireViewer();
  const allowed = (process.env.INTERNAL_ADMIN_EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean);
  if (!viewer.demo && !allowed.includes(viewer.email.toLowerCase())) redirect("/dashboard");
  return viewer;
}
