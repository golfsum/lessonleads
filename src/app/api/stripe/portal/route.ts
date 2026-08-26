import { requireViewer } from "@/lib/auth/session";
import { getStripe } from "@/lib/billing/stripe";
import { isDemoMode } from "@/lib/demo/store";
import { hasTrustedOrigin } from "@/lib/security/request";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const viewer = await requireViewer();
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (isDemoMode()) return Response.json({ error: "Billing is disabled in the local demo workspace." }, { status: 409 });
  try {
    const supabase = createSupabaseAdminClient();
    const { data } = await supabase.from("subscriptions").select("stripe_customer_id").eq("organization_id", viewer.organizationId).maybeSingle();
    if (!data?.stripe_customer_id) return Response.json({ error: "No Stripe customer is connected to this account." }, { status: 404 });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    const session = await getStripe().billingPortal.sessions.create({ customer: data.stripe_customer_id, return_url: `${appUrl}/dashboard/settings` });
    return Response.json({ url: session.url });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    return Response.json({ error: code.startsWith("STRIPE_") ? "Stripe billing is not configured yet." : "Could not open billing." }, { status: code.startsWith("STRIPE_") ? 503 : 500 });
  }
}
