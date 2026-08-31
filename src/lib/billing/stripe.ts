import "server-only";

import Stripe from "stripe";
import type { PaidPlanId, PlanId } from "./plans";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_NOT_CONFIGURED");
  return new Stripe(key);
}

function configuredPriceIds(plan: PaidPlanId) {
  const canonical = process.env[`STRIPE_PRICE_${plan.toUpperCase()}`]?.trim();
  const legacy = process.env[`STRIPE_${plan.toUpperCase()}_PRICE_ID`]?.trim();
  return [canonical, legacy].filter((value, index, values): value is string => Boolean(value) && values.indexOf(value) === index);
}

export function getPriceId(plan: PaidPlanId) {
  const priceId = configuredPriceIds(plan)[0];
  if (!priceId) throw new Error("STRIPE_PRICE_NOT_CONFIGURED");
  return priceId;
}

export function planFromStripePriceId(priceId: string | undefined): PlanId {
  if (!priceId) return "free";
  for (const plan of ["academy", "pro", "solo"] as const) {
    if (configuredPriceIds(plan).includes(priceId)) return plan;
  }
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
