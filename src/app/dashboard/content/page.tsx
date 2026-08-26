import { ContentManager } from "@/components/dashboard/content-manager";
import { PlanGate } from "@/components/dashboard/plan-gate";
import { hasPlanFeature } from "@/lib/billing/plans";
import { getWorkspaceData } from "@/lib/data/workspace";

export const dynamic = "force-dynamic";

export default async function ContentPage() {
  const data = await getWorkspaceData();
  return (
    <div className="dashboard-page">
      <div className="dashboard-page-heading">
        <div>
          <h1>Content</h1>
          <p>Your video library. The widget recommends these when a golfer&apos;s question matches.</p>
        </div>
      </div>
      {hasPlanFeature(data.subscription.plan, "youtubeImport") ? null : (
        <PlanGate
          currentPlan={data.subscription.plan}
          required="pro"
          title="YouTube import is on Pro"
          body="Paste your channel and the widget can recommend your videos when a golfer's question matches. Upgrade when you're ready to put that library to work."
        />
      )}
      <ContentManager items={data.contentItems} youtubeLocked={!hasPlanFeature(data.subscription.plan, "youtubeImport")} />
    </div>
  );
}
