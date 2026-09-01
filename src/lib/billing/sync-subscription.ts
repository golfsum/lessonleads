import "server-only";

import type Stripe from "stripe";
import type { Plan, Subscription } from "@/lib/domain/types";
import { isPaidPlanId } from "@/lib/billing/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripe, planFromStripePriceId } from "./stripe";

function mapStripeStatus(status: string): Subscription["status"] {
  if (status === "active" || status === "trialing" || status === "past_due" || status === "canceled") return status;
  if (status === "unpaid" || status === "paused" || status === "incomplete") return "past_due";
  if (status === "incomplete_expired") return "canceled";
  return "active";
}

export async function syncStripeSubscription(subscription: Stripe.Subscription, fallbackOrganizationId?: string) {
  const organizationId = subscription.metadata.organizationId || fallbackOrganizationId;
  if (!organizationId) {
    console.error("[stripe/sync] missing organizationId", subscription.id);
    return null;
  }
  const canceled = ["canceled", "incomplete_expired"].includes(subscription.status);
  const currentPeriodEnd = subscription.items.data.reduce((latest, item) => Math.max(latest, item.current_period_end ?? 0), 0);
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const priceId = subscription.items.data[0]?.price?.id;
  const fromPrice = planFromStripePriceId(priceId);
  const metadataPlan = subscription.metadata.plan ?? "";
  const fromMeta = isPaidPlanId(metadataPlan) ? metadataPlan : null;
  const plan: Plan = canceled ? "free" : fromPrice !== "free" ? fromPrice : fromMeta ?? "solo";
  const { error } = await createSupabaseAdminClient().from("subscriptions").upsert(
    {
      organization_id: organizationId,
      plan,
      status: canceled ? "canceled" : mapStripeStatus(subscription.status),
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" },
  );
  if (error) {
    console.error("[stripe/sync]", error.message);
    throw error;
  }
  return plan;
}

async function subscriptionFromSession(session: Stripe.Checkout.Session) {
  const stripe = getStripe();
  if (typeof session.subscription === "object" && session.subscription && "id" in session.subscription) {
    return session.subscription as Stripe.Subscription;
  }
  if (typeof session.subscription === "string") {
    return stripe.subscriptions.retrieve(session.subscription);
  }
  return null;
}

export async function applyCheckoutSession(session: Stripe.Checkout.Session) {
  const organizationId = session.metadata?.organizationId;
  const subscription = await subscriptionFromSession(session);
  if (!subscription) return null;
  return syncStripeSubscription(subscription, organizationId);
}

export async function refreshSubscriptionFromStripe(input: {
  organizationId: string;
  sessionId?: string;
  customerId?: string;
}) {
  const stripe = getStripe();
  if (input.sessionId && /^cs_(test|live)_[A-Za-z0-9]+$/.test(input.sessionId)) {
    const session = await stripe.checkout.sessions.retrieve(input.sessionId, { expand: ["subscription"] });
    if (session.metadata?.organizationId && session.metadata.organizationId !== input.organizationId) {
      return null;
    }
    return applyCheckoutSession(session);
  }
  if (!input.customerId) return null;
  const list = await stripe.subscriptions.list({ customer: input.customerId, status: "all", limit: 5 });
  const paid = list.data.find((item) => !["canceled", "incomplete_expired"].includes(item.status)) ?? list.data[0];
  if (!paid) return null;
  return syncStripeSubscription(paid, input.organizationId);
}
