import { requireViewer } from "@/lib/auth/session";
import {
  getPriceId,
  getStripe,
  isMissingStripeCustomer,
  stripeErrorMessage,
} from "@/lib/billing/stripe";
import { isDemoMode } from "@/lib/demo/store";
import { hasTrustedOrigin } from "@/lib/security/request";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const viewer = await requireViewer();
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (isDemoMode()) return Response.json({ error: "Billing is disabled in the local demo workspace." }, { status: 409 });
  try {
    const body = (await request.json().catch(() => ({}))) as { plan?: string };
    const plan = body.plan === "pro" ? "pro" : "solo";
    const stripe = getStripe();
    const price = getPriceId(plan);
    const supabase = createSupabaseAdminClient();
    const { data: existing, error: existingError } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("organization_id", viewer.organizationId)
      .maybeSingle();
    if (existingError) throw existingError;

    let customerId = (existing?.stripe_customer_id as string | null) || null;
    if (customerId) {
      try {
        await stripe.customers.retrieve(customerId);
      } catch (error) {
        if (!isMissingStripeCustomer(error)) throw error;
        customerId = null;
      }
    }
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: viewer.email,
        name: viewer.name,
        metadata: { organizationId: viewer.organizationId },
      });
      customerId = customer.id;
      const { error: upsertError } = await supabase.from("subscriptions").upsert(
        {
          organization_id: viewer.organizationId,
          stripe_customer_id: customerId,
          plan: "free",
          status: "free",
        },
        { onConflict: "organization_id" },
      );
      if (upsertError) throw upsertError;
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price, quantity: 1 }],
      allow_promotion_codes: true,
      // Sandbox accounts turn Managed Payments on by default, which requires
      // product tax codes. LessonLeads stays the merchant of record.
      managed_payments: { enabled: false },
      success_url: `${appUrl}/dashboard/settings?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/dashboard/settings?billing=canceled`,
      metadata: { organizationId: viewer.organizationId, plan },
      subscription_data: { metadata: { organizationId: viewer.organizationId, plan } },
    });
    if (!session.url) throw new Error("CHECKOUT_URL_MISSING");
    return Response.json({ url: session.url });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const configurationError = code.startsWith("STRIPE_");
    if (!configurationError) console.error("[stripe/checkout]", stripeErrorMessage(error));
    return Response.json(
      {
        error: configurationError ? "Stripe billing is not configured yet." : stripeErrorMessage(error),
      },
      { status: configurationError ? 503 : 500 },
    );
  }
}
