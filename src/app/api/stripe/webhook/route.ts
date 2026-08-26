import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { applyCheckoutSession, syncStripeSubscription } from "@/lib/billing/sync-subscription";

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
      await syncStripeSubscription(event.data.object as Stripe.Subscription);
    }
    if (event.type === "checkout.session.completed") {
      await applyCheckoutSession(event.data.object as Stripe.Checkout.Session);
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error("[stripe/webhook]", error instanceof Error ? error.message : error);
    return Response.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
