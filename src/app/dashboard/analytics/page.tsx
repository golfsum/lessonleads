import { PlanGate } from "@/components/dashboard/plan-gate";
import { calculateAnalytics } from "@/lib/analytics";
import { hasPlanFeature } from "@/lib/billing/plans";
import { getWorkspaceData } from "@/lib/data/workspace";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const data = await getWorkspaceData();
  const analytics = calculateAnalytics(data);
  const stats = [
    { label: "Widget views", value: analytics.widgetViews },
    { label: "Widget opens", value: analytics.widgetOpens },
    { label: "Conversations", value: analytics.conversations },
    { label: "Messages", value: analytics.messages },
    { label: "Leads", value: analytics.leads },
    { label: "High intent", value: analytics.highIntentLeads },
    { label: "Booking clicks", value: analytics.bookingClicks },
    { label: "Swing uploads", value: analytics.swingUploads },
  ];
  return (
    <div className="dashboard-page">
      <div className="dashboard-page-heading">
        <div>
          <h1>Analytics</h1>
          <p>How your widget turns visitors into lesson leads. Booking clicks are link clicks, not confirmed bookings.</p>
        </div>
      </div>
      {hasPlanFeature(data.subscription.plan, "analytics") ? null : (
        <PlanGate
          currentPlan={data.subscription.plan}
          required="pro"
          title="See the full conversion funnel"
          body="Overview already shows leads and booking clicks. Pro adds the full funnel, topics, video views, and month-over-month detail."
        />
      )}
      {hasPlanFeature(data.subscription.plan, "analytics") ? (
        <>
      <section className="stat-grid">
        {stats.map((stat) => <article key={stat.label}><div><span>{stat.label}</span><strong>{stat.value}</strong></div></article>)}
      </section>

      <section className="dashboard-grid half">
        <article className="panel funnel-panel">
          <div className="panel-heading"><div><p className="eyebrow">Funnel</p><h2>Visitor to booking click</h2></div></div>
          {analytics.funnel.map((stage, index) => {
            const first = analytics.funnel[0]?.count ?? 0;
            const width = first > 0 ? Math.max((stage.count / first) * 100, 4) : 4;
            return (
              <div className="funnel-row" key={stage.label}>
                <span>{stage.label}</span>
                <div><i style={{ width: `${width}%` }} /></div>
                <strong>{stage.count}{index > 0 && stage.rateFromPrevious !== null ? ` (${stage.rateFromPrevious}%)` : ""}</strong>
              </div>
            );
          })}
          <dl className="rate-summary">
            <div><dt>Visitor &rarr; lead</dt><dd>{analytics.visitorToLeadRate}%</dd></div>
            <div><dt>Lead &rarr; booking click</dt><dd>{analytics.leadToBookingClickRate}%</dd></div>
          </dl>
        </article>

        <div className="dashboard-grid">
          <article className="panel">
            <div className="panel-heading"><div><p className="eyebrow">What converts</p><h2>Services golfers click</h2></div></div>
            <div className="bar-list offering-bars">
              {analytics.topServices.map((item) => <div key={item.label}><span>{item.label}</span><div><i style={{ width: `${item.percentage}%` }} /></div><strong>{item.count}</strong></div>)}
              {analytics.topServices.length === 0 ? <p className="empty-state">Service clicks show up here.</p> : null}
            </div>
          </article>
          <article className="panel">
            <div className="panel-heading"><div><p className="eyebrow">What golfers ask</p><h2>Top topics</h2></div></div>
            <div className="bar-list">
              {analytics.topTopics.map((item) => <div key={item.label}><span className="capitalize">{item.label}</span><div><i style={{ width: `${item.percentage}%` }} /></div><strong>{item.percentage}%</strong></div>)}
              {analytics.topTopics.length === 0 ? <p className="empty-state">Topics appear once golfers start chatting.</p> : null}
            </div>
          </article>
        </div>
      </section>

      <section className="panel analytics-note">
        <h2>Reading these numbers</h2>
        <p>
          Widget views count visitors who saw the launcher. Opens are visitors who clicked it. A conversation starts with the first message.
          Booking clicks mean a golfer opened your booking link — mark leads as Booked in the lead inbox when they confirm, so your win rate stays honest.
        </p>
      </section>
        </>
      ) : null}
    </div>
  );
}
