import type Stripe from "stripe";
import { getStripe, planFromStripePriceId } from "@/lib/billing/stripe";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

async function syncSubscription(subscription: Stripe.Subscription) {
  const organizationId = subscription.metadata.organizationId;
  if (!organizationId) return;
  const active = ["active", "trialing", "past_due"].includes(subscription.status);
  const currentPeriodEnd = subscription.items.data.reduce((latest, item) => Math.max(latest, item.current_period_end ?? 0), 0);
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const priceId = subscription.items.data[0]?.price?.id;
  const fromPrice = planFromStripePriceId(priceId);
  const fromMeta = subscription.metadata.plan === "pro" || subscription.metadata.plan === "solo" ? subscription.metadata.plan : null;
  const plan = active ? (fromPrice !== "free" ? fromPrice : fromMeta ?? "solo") : "free";
  await createSupabaseAdminClient().from("subscriptions").upsert({
    organization_id: organizationId,
    plan,
    status: subscription.status,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  });
}

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return Response.json({ error: "Stripe webhook is not configured." }, { status: 503 });
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
  } catch {
    return Response.json({ error: "Invalid webhook signature." }, { status: 400 });
  }
  try {
    if (["customer.subscription.created", "customer.subscription.updated", "customer.subscription.deleted"].includes(event.type)) {
      await syncSubscription(event.data.object as Stripe.Subscription);
    }
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      if (typeof session.subscription === "string") await syncSubscription(await getStripe().subscriptions.retrieve(session.subscription));
    }
    return Response.json({ received: true });
  } catch {
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
