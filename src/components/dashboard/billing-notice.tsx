import { CheckCircle2, Info } from "lucide-react";
import { plans, type PlanId } from "@/lib/billing/plans";

export function BillingNotice({
  billing,
  planId,
}: {
  billing?: string;
  planId: PlanId;
}) {
  if (billing === "canceled") {
    return (
      <section className="billing-flash billing-flash-muted" role="status">
        <Info size={18} aria-hidden="true" />
        <div>
          <strong>Checkout canceled</strong>
          <p>No charge was made. You can upgrade whenever you are ready.</p>
        </div>
      </section>
    );
  }
  if (billing !== "success") return null;
  if (planId === "free") {
    return (
      <section className="billing-flash" role="status">
        <CheckCircle2 size={18} aria-hidden="true" />
        <div>
          <strong>Payment received</strong>
          <p>Stripe is confirming your plan. Refresh this page in a few seconds if it still says Free.</p>
        </div>
      </section>
    );
  }
  const plan = plans[planId];
  return (
    <section className="billing-flash" role="status">
      <CheckCircle2 size={18} aria-hidden="true" />
      <div>
        <strong>You are on {plan.name}</strong>
        <p>
          {planId === "solo"
            ? "Thanks for upgrading. Your widget now has 150 visitor conversations a month, unlimited leads, and your branding."
            : "Thanks for upgrading. Your widget now includes YouTube, swing uploads, analytics, and 1,000 visitor conversations a month."}
        </p>
      </div>
    </section>
  );
}
