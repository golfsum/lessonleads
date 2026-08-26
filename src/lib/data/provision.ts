import "server-only";

import { randomBytes } from "node:crypto";
import type { User } from "@supabase/supabase-js";
import { slugify } from "@/lib/domain/format";
import { defaultMenu, defaultTheme, firstNameFrom } from "@/lib/domain/defaults";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function ensureUserWorkspace(user: User) {
  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (existing) return existing.organization_id as string;

  const fullName = String(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Coach").slice(0, 100);
  const first = firstNameFrom(fullName);
  const token = randomBytes(5).toString("hex");
  const orgSlug = `${slugify(fullName) || "coach"}-${token.slice(0, 6)}`;

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: `${fullName} Coaching`.slice(0, 120), slug: orgSlug })
    .select("id")
    .single();
  if (orgError || !org) throw new Error(orgError?.message ?? "Could not create organization.");

  const orgId = org.id as string;
  const { error: memberError } = await admin.from("organization_members").insert({
    organization_id: orgId,
    user_id: user.id,
    role: "owner",
  });
  if (memberError) throw new Error(memberError.message);

  const { data: coach, error: coachError } = await admin
    .from("coach_profiles")
    .insert({
      organization_id: orgId,
      user_id: user.id,
      name: fullName,
      business_name: `${fullName} Golf`.slice(0, 120),
      email: user.email ?? "",
    })
    .select("id")
    .single();
  if (coachError || !coach) throw new Error(coachError?.message ?? "Could not create coach profile.");

  await admin.from("websites").insert({ organization_id: orgId });
  await admin.from("subscriptions").insert({ organization_id: orgId });
  const { error: widgetError } = await admin.from("widgets").insert({
    organization_id: orgId,
    coach_id: coach.id,
    public_id: token,
    name: `${fullName} Widget`,
    slug: orgSlug,
    status: "draft",
    theme: defaultTheme(first),
    menu: defaultMenu(first),
    default_section_key: "ask",
  });
  if (widgetError) throw new Error(widgetError.message);
  return orgId;
}
