import { CheckoutButton } from "./checkout-button";
import type { PaidPlanId } from "@/lib/billing/plans";

export function PlanGate({
  currentPlan,
  required = "solo",
  title,
  body,
}: {
  currentPlan: string;
  required?: PaidPlanId;
  title: string;
  body: string;
}) {
  return (
    <aside className="panel plan-gate">
      <p className="eyebrow">{required === "academy" ? "Academy" : required === "pro" ? "Pro" : "Solo"}</p>
      <h2>{title}</h2>
      <p>{body}</p>
      <CheckoutButton currentPlan={currentPlan} targetPlan={required} />
    </aside>
  );
}
