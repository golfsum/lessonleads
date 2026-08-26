import { BillingNotice } from "@/components/dashboard/billing-notice";
import { CheckoutButton } from "@/components/dashboard/checkout-button";
import { SettingsForm } from "@/components/dashboard/settings-form";
import { refreshSubscriptionFromStripe } from "@/lib/billing/sync-subscription";
import { getWorkspaceData } from "@/lib/data/workspace";
import { isPlanId, plans } from "@/lib/billing/plans";
import { usageState } from "@/lib/billing/usage";
import { isDemoMode } from "@/lib/demo/store";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ billing?: string; session_id?: string }>;
}) {
  const query = await searchParams;
  let data = await getWorkspaceData();
  const shouldRefresh =
    !isDemoMode() &&
    (query.billing === "success" || (data.subscription.plan === "free" && Boolean(data.subscription.stripeCustomerId)));
  if (shouldRefresh) {
    try {
      await refreshSubscriptionFromStripe({
        organizationId: data.subscription.organizationId,
        sessionId: query.session_id,
        customerId: data.subscription.stripeCustomerId,
      });
      data = await getWorkspaceData();
    } catch (error) {
      console.error("[billing/return]", error instanceof Error ? error.message : error);
    }
  }
  const planId = isPlanId(data.subscription.plan) ? data.subscription.plan : "free";
  const plan = plans[planId];
  const usage = usageState(data);
  return (
    <div className="dashboard-page">
      <BillingNotice billing={query.billing} planId={planId} />
      <div className="dashboard-page-heading">
        <div>
          <h1>Settings</h1>
          <p>Your coach profile powers the widget&apos;s Coach section and how the assistant talks about you.</p>
        </div>
      </div>
      <div className="settings-layout">
        <SettingsForm coach={data.coach} />
        <aside className="panel plan-card">
          <p className="eyebrow">Current plan</p>
          <h2>{plan.name}</h2>
          <strong>{plan.priceCents === 0 ? "$0" : `${plan.priceLabel} per month`}</strong>
          <p>
            {planId === "free"
              ? `${usage.conversations} of ${plan.monthlyConversations} visitor conversations and ${usage.leads} of ${plan.monthlyLeads} leads this month. Dashboard preview is unlimited.`
              : planId === "solo"
                ? `${usage.conversations} of ${plan.monthlyConversations} visitor conversations this month. Unlimited leads, your branding.`
                : `${usage.conversations} of ${plan.monthlyConversations} visitor conversations this month. YouTube, swing uploads, and analytics included.`}
          </p>
          <ul className="plan-feature-list">
            {plan.features.map((feature) => <li key={feature}>{feature}</li>)}
          </ul>
          {planId === "free" ? (
            <>
              <CheckoutButton currentPlan={planId} targetPlan="solo" />
              <CheckoutButton currentPlan={planId} targetPlan="pro" label="See Pro · $79/mo" />
            </>
          ) : planId === "solo" ? (
            <>
              <CheckoutButton currentPlan={planId} targetPlan="pro" />
              <CheckoutButton currentPlan={planId} targetPlan="solo" label="Manage billing" />
            </>
          ) : (
            <CheckoutButton currentPlan={planId} targetPlan="pro" />
          )}
          <small>Stripe is the billing system of record. Test payments in the Stripe sandbox update this plan when you return from checkout.</small>
        </aside>
      </div>
    </div>
  );
}
