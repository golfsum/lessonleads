import "server-only";

import type { User } from "@supabase/supabase-js";
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

function internalAdminEmailAllowed(email: string | null | undefined) {
  if (!email) return false;
  const allowed = (process.env.INTERNAL_ADMIN_EMAILS ?? "")
    .split(",")
    .map((candidate) => candidate.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.trim().toLowerCase());
}

export interface InternalAdminViewer {
  id: string;
  email: string;
  name: string;
}

async function getInternalAdminViewer(): Promise<InternalAdminViewer | null> {
  if (isDemoMode()) return null;
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user || !internalAdminEmailAllowed(user.email)) return null;
    return {
      id: user.id,
      email: user.email ?? "",
      name: String(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Admin"),
    };
  } catch {
    return null;
  }
}

/**
 * A fail-closed check for API handlers and server-side data access.
 * This deliberately verifies the Supabase user directly instead of calling
 * getViewer(), which can provision a customer workspace for a new account.
 */
export async function hasInternalAdminSession(): Promise<boolean> {
  return Boolean(await getInternalAdminViewer());
}

export async function requireAdmin() {
  if (isDemoMode()) redirect("/dashboard");
  let user: User | null = null;
  try {
    const supabase = await createSupabaseServerClient();
    const result = await supabase.auth.getUser();
    if (!result.error) user = result.data.user;
  } catch {
    user = null;
  }
  if (!user) redirect("/login");
  if (!internalAdminEmailAllowed(user.email)) redirect("/dashboard");
  return {
    id: user.id,
    email: user.email ?? "",
    name: String(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Admin"),
  } satisfies InternalAdminViewer;
}
