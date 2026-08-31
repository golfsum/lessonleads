import Link from "next/link";
import { ArrowRight, CalendarCheck, Clapperboard, Flame, MessagesSquare, MousePointerClick, UsersRound } from "lucide-react";
import { UsageBanner } from "@/components/dashboard/usage-banner";
import { UsageIndicator } from "@/components/dashboard/usage-indicator";
import { calculateAnalytics } from "@/lib/analytics";
import { usageState } from "@/lib/billing/usage";
import { getWorkspaceData } from "@/lib/data/workspace";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export default async function DashboardOverviewPage() {
  const data = await getWorkspaceData();
  const analytics = calculateAnalytics(data);
  const usage = usageState(data);
  const stats = [
    { label: "Widget opens", value: analytics.widgetOpens, icon: MousePointerClick },
    { label: "AI Conversations", value: analytics.conversations, icon: MessagesSquare },
    { label: "Leads Captured", value: analytics.leads, icon: UsersRound },
    { label: "High-intent leads", value: analytics.highIntentLeads, icon: Flame },
    { label: "Booking Clicks", value: analytics.bookingClicks, icon: CalendarCheck },
    { label: "Swing uploads", value: analytics.swingUploads, icon: Clapperboard },
  ];
  const widgetLive = data.widget.status === "active";
  return (
    <div className="dashboard-page">
      <UsageIndicator used={usage.conversations} limit={usage.conversationLimit} resetAt={usage.resetAt} />
      <UsageBanner currentPlan={data.subscription.plan} prompt={usage.prompt} />
      <section className="value-banner">
        <div>
          <p className="eyebrow">This month</p>
          <h1>
            {analytics.leads > 0
              ? `Your widget turned ${analytics.conversations} conversations into ${analytics.leads} lesson leads.`
              : "Your widget is ready to turn website visitors into lesson leads."}
          </h1>
          <p>Every lead arrives with the golfer&apos;s conversation, intent level, and the lesson they were pointed to.</p>
        </div>
        <Link className="button button-light" href="/dashboard/leads">Open lead inbox <ArrowRight size={16} /></Link>
      </section>

      <section className="stat-grid six">
        {stats.map(({ label, value, icon: Icon }) => <article key={label}><div><span>{label}</span><strong>{value}</strong></div><Icon size={20} /></article>)}
      </section>

      <section className="dashboard-grid two-thirds">
        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Newest opportunities</p><h2>Recent leads</h2></div><Link href="/dashboard/leads">View all</Link></div>
          <div className="recent-leads">
            {data.leads.slice(0, 5).map((lead) => (
              <Link href={`/dashboard/leads/${lead.id}`} key={lead.id}>
                <span className="avatar">{lead.firstName[0]}{(lead.lastName?.[0] ?? "")}</span>
                <div><strong>{lead.firstName} {lead.lastName ?? ""}</strong><small>{lead.interest ?? lead.email}</small></div>
                <span className={`intent-pill ${lead.intentLevel}`}>{lead.intentLevel} intent</span>
                <span className={`status ${lead.status}`}>{lead.status.replaceAll("_", " ")}</span>
              </Link>
            ))}
            {data.leads.length === 0 ? <div className="empty-state">No leads yet. Install the widget to start capturing golfers.</div> : null}
          </div>
        </article>
        <article className="panel funnel-panel">
          <div className="panel-heading"><div><p className="eyebrow">Conversion funnel</p><h2>Visitor to booking click</h2></div></div>
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
        </article>
      </section>

      <section className="dashboard-grid half">
        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">What golfers ask about</p><h2>Top topics</h2></div></div>
          <div className="bar-list">
            {analytics.topTopics.map((item) => <div key={item.label}><span className="capitalize">{item.label}</span><div><i style={{ width: `${item.percentage}%` }} /></div><strong>{item.percentage}%</strong></div>)}
            {analytics.topTopics.length === 0 ? <p className="empty-state">Topics appear once golfers start chatting.</p> : null}
          </div>
        </article>
        <article className="panel next-step-panel">
          <p className="eyebrow">Widget status</p>
          <h2>{widgetLive ? "Your widget is live." : "Your widget is not published yet."}</h2>
          <p>
            {widgetLive
              ? `Latest activity ${data.events.length > 0 ? dateFormat.format(new Date(data.events[data.events.length - 1].occurredAt)) : "—"}. Preview it or grab the install code.`
              : "Finish customizing, then paste one line of code onto your website."}
          </p>
          <div>
            <Link className="button button-secondary" href={`/l/${data.widget.slug}`} target="_blank">Preview widget</Link>
            <Link className="button button-primary" href="/dashboard/install">Get install code</Link>
          </div>
        </article>
      </section>
    </div>
  );
}
