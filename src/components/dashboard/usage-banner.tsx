import Link from "next/link";
import { plans, type PaidPlanId } from "@/lib/billing/plans";
import { CheckoutButton } from "./checkout-button";

export function UsageBanner({ prompt, currentPlan }: { prompt: string | null; currentPlan: string }) {
  if (!prompt) return null;
  const upgradeTarget: PaidPlanId | null =
    currentPlan === "free" ? "solo" : currentPlan === "solo" ? "pro" : currentPlan === "pro" ? "academy" : null;
  const targetLabel = upgradeTarget ? `Upgrade to ${plans[upgradeTarget].name} · ${plans[upgradeTarget].priceLabel}/mo` : null;
  return (
    <section className="usage-banner">
      <div>
        <p className="eyebrow">Keep it working</p>
        <p>{prompt}</p>
      </div>
      {upgradeTarget && targetLabel ? (
        <CheckoutButton currentPlan={currentPlan} targetPlan={upgradeTarget} label={targetLabel} />
      ) : (
        <Link className="button button-primary" href="/dashboard/settings">Billing</Link>
      )}
    </section>
  );
}
