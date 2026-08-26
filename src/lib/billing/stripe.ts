import "server-only";

import Stripe from "stripe";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_NOT_CONFIGURED");
  return new Stripe(key);
}

export function getPriceId(plan: "solo" | "pro") {
  const priceId = plan === "pro" ? process.env.STRIPE_PRO_PRICE_ID : process.env.STRIPE_SOLO_PRICE_ID;
  if (!priceId) throw new Error("STRIPE_PRICE_NOT_CONFIGURED");
  return priceId;
}

export function planFromStripePriceId(priceId: string | undefined): "solo" | "pro" | "free" {
  if (!priceId) return "free";
  if (priceId === process.env.STRIPE_PRO_PRICE_ID) return "pro";
  if (priceId === process.env.STRIPE_SOLO_PRICE_ID) return "solo";
  return "free";
}

export function isStripeError(error: unknown): error is Stripe.errors.StripeError {
  return Boolean(error && typeof error === "object" && "type" in error);
}

export function stripeErrorMessage(error: unknown) {
  if (isStripeError(error) && error.message) return error.message.slice(0, 280);
  if (error instanceof Error && error.message) return error.message.slice(0, 280);
  return "Could not start checkout.";
}

export function isMissingStripeCustomer(error: unknown) {
  if (!isStripeError(error) || error.code !== "resource_missing") return false;
  const param = "param" in error ? String(error.param ?? "") : "";
  const message = (error.message ?? "").toLowerCase();
  return param === "customer" || param.startsWith("cus_") || message.includes("no such customer");
}
