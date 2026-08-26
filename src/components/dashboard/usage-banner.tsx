import Link from "next/link";
import { CheckoutButton } from "./checkout-button";

export function UsageBanner({ prompt, currentPlan }: { prompt: string | null; currentPlan: string }) {
  if (!prompt) return null;
  return (
    <section className="usage-banner">
      <div>
        <p className="eyebrow">Keep it working</p>
        <p>{prompt}</p>
      </div>
      {currentPlan === "free" ? (
        <CheckoutButton currentPlan={currentPlan} targetPlan="solo" label="Upgrade to Solo · $29/mo" />
      ) : currentPlan === "solo" ? (
        <CheckoutButton currentPlan={currentPlan} targetPlan="pro" label="Upgrade to Pro · $79/mo" />
      ) : (
        <Link className="button button-primary" href="/dashboard/settings">Billing</Link>
      )}
    </section>
  );
}
