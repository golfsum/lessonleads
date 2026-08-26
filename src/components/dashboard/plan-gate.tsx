import { CheckoutButton } from "./checkout-button";

export function PlanGate({
  currentPlan,
  required = "solo",
  title,
  body,
}: {
  currentPlan: string;
  required?: "solo" | "pro";
  title: string;
  body: string;
}) {
  return (
    <aside className="panel plan-gate">
      <p className="eyebrow">{required === "pro" ? "Pro" : "Solo"}</p>
      <h2>{title}</h2>
      <p>{body}</p>
      <CheckoutButton currentPlan={currentPlan} targetPlan={required} />
    </aside>
  );
}
