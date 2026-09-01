import { PlanGate } from "@/components/dashboard/plan-gate";
import { calculateAnalytics } from "@/lib/analytics";
import { hasPlanFeature } from "@/lib/billing/plans";
import { getWorkspaceData } from "@/lib/data/workspace";
import { isCourseLike } from "@/lib/domain/organization";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const data = await getWorkspaceData();
  const analytics = calculateAnalytics(data);
  const course = isCourseLike(data.organization.type);
  const stats = course
    ? [
        { label: "Widget views", value: analytics.widgetViews },
        { label: "Widget opens", value: analytics.widgetOpens },
        { label: "AI Conversations", value: analytics.conversations },
        { label: "Tee time searches", value: analytics.teeTimeSearches },
        { label: "Tee time results", value: analytics.teeTimeResults },
        { label: "Booking Clicks", value: analytics.teeTimeBookingClicks },
        { label: "Lesson leads", value: analytics.lessonLeads },
        { label: "Membership leads", value: analytics.membershipLeads },
        { label: "Tournament leads", value: analytics.tournamentLeads },
        { label: "Other leads", value: analytics.otherLeads },
      ]
    : [
        { label: "Widget views", value: analytics.widgetViews },
        { label: "Widget opens", value: analytics.widgetOpens },
        { label: "AI Conversations", value: analytics.conversations },
        { label: "Messages", value: analytics.messages },
        { label: "Leads Captured", value: analytics.leads },
        { label: "High intent", value: analytics.highIntentLeads },
        { label: "Booking Clicks", value: analytics.bookingClicks },
        { label: "Swing uploads", value: analytics.swingUploads },
      ];
  return (
    <div className="dashboard-page">
      <div className="dashboard-page-heading">
        <div>
          <h1>Analytics</h1>
          <p>
            {course
              ? "How the widget turns visits into searches, booking clicks, and inquiries. A booking click is not a confirmed tee time."
              : "How your widget turns visitors into lesson leads. Booking clicks are link clicks, not confirmed bookings."}
          </p>
        </div>
      </div>
      {hasPlanFeature(data.subscription.plan, "analytics") ? null : (
        <PlanGate
          currentPlan={data.subscription.plan}
          required="solo"
          title="See the full conversion funnel"
          body="Solo adds the basic conversion funnel. Pro adds richer knowledge, video, and conversion detail as your coaching business grows."
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
                <div><dt>Conversation &rarr; lead</dt><dd>{analytics.conversationToLeadRate}%</dd></div>
                <div><dt>Lead &rarr; booking click</dt><dd>{analytics.leadToBookingClickRate}%</dd></div>
                <div><dt>Conversation &rarr; booking click</dt><dd>{analytics.conversationToBookingClickRate}%</dd></div>
              </dl>
            </article>

            <div className="dashboard-grid">
              {course ? (
                <article className="panel">
                  <div className="panel-heading"><div><p className="eyebrow">High-value funnels</p><h2>Inquiries</h2></div></div>
                  <div className="bar-list offering-bars">
                    {analytics.leadFunnels.map((item) => <div key={item.label}><span>{item.label}</span><div><i style={{ width: `${Math.max(item.count * 10, item.count ? 10 : 0)}%` }} /></div><strong>{item.count}</strong></div>)}
                  </div>
                </article>
              ) : (
                <article className="panel">
                  <div className="panel-heading"><div><p className="eyebrow">What converts</p><h2>Services golfers click</h2></div></div>
                  <div className="bar-list offering-bars">
                    {analytics.topServices.map((item) => <div key={item.label}><span>{item.label}</span><div><i style={{ width: `${item.percentage}%` }} /></div><strong>{item.count}</strong></div>)}
                    {analytics.topServices.length === 0 ? <p className="empty-state">Service clicks show up here.</p> : null}
                  </div>
                </article>
              )}
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
              {course
                ? " Tee time booking clicks mean a golfer opened the provider booking page. Confirmed tee time bookings only appear if a provider later sends a reservation confirmation."
                : " Booking clicks mean a golfer opened your booking link — mark leads as Booked in the lead inbox when they confirm, so your win rate stays honest."}
            </p>
          </section>
        </>
      ) : null}
    </div>
  );
}
