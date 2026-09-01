import type { CSSProperties } from "react";
import Link from "next/link";
import { Building2, Eye, MessageSquareText, MousePointerClick, TicketCheck, UsersRound, UserRoundSearch, Workflow } from "lucide-react";
import { getAdminOverview } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const planOrder = ["free", "solo", "pro", "academy"] as const;
const statusOrder = ["free", "active", "trialing", "past_due", "canceled"] as const;

export default async function AdminOverviewPage() {
  await requireAdmin();
  const data = await getAdminOverview();
  const metrics = [
    { label: "Estimated site visitors", value: data.siteSessions30d, detail: `${data.siteSessions7d} in the last 7 days`, icon: UserRoundSearch },
    { label: "Marketing page views", value: data.pageViews30d, detail: "Last 30 days", icon: Eye },
    { label: "Client organizations", value: data.clients, detail: `${data.newClients30d} added in 30 days`, icon: Building2 },
    { label: "Customer users", value: data.users, detail: "Distinct signed-in accounts", icon: UsersRound },
    { label: "Unique widget sessions", value: data.widgetSessions30d, detail: "Across client widgets, 30 days", icon: MousePointerClick },
    { label: "AI conversations", value: data.conversations30d, detail: "Client widgets, 30 days", icon: MessageSquareText },
    { label: "Leads captured", value: data.leads30d, detail: `${data.bookingClicks30d} booking clicks`, icon: Workflow },
    { label: "Open tickets", value: data.openTickets, detail: "Open, active, or waiting", icon: TicketCheck },
  ];
  const maxPlan = Math.max(...planOrder.map((key) => data.planDistribution[key]), 1);
  const maxStatus = Math.max(...statusOrder.map((key) => data.subscriptionDistribution[key]), 1);
  return (
    <div className="admin-page">
      <div className="admin-heading"><div><h1>LessonLeads operations</h1><p>Marketing reach, customer usage, account health, and support activity in one place. Visitor counts are estimates based on anonymous browser IDs.</p></div></div>
      {data.metricsTruncated ? <aside className="admin-data-note">A high-volume metric reached its safe scan cap. Counts are still usable, but distinct-session totals may be understated.</aside> : null}
      <section className="admin-stat-grid">
        {metrics.map(({ label, value, detail, icon: Icon }) => <article className="admin-stat" key={label}><div><span>{label}</span><strong>{value.toLocaleString()}</strong><small>{detail}</small></div><Icon size={19} /></article>)}
      </section>
      <section className="admin-grid two">
        <article className="admin-panel">
          <div className="admin-panel-heading"><div><h2>Plans</h2><p>Current client plan distribution</p></div></div>
          <div className="admin-distribution">
            {planOrder.map((key) => <div key={key}><span>{key}</span><i style={{ "--bar-width": `${(data.planDistribution[key] / maxPlan) * 100}%` } as CSSProperties} /><strong>{data.planDistribution[key]}</strong></div>)}
          </div>
        </article>
        <article className="admin-panel">
          <div className="admin-panel-heading"><div><h2>Subscription state</h2><p>Stripe-backed billing status</p></div></div>
          <div className="admin-distribution">
            {statusOrder.map((key) => <div key={key}><span>{key.replaceAll("_", " ")}</span><i style={{ "--bar-width": `${(data.subscriptionDistribution[key] / maxStatus) * 100}%` } as CSSProperties} /><strong>{data.subscriptionDistribution[key]}</strong></div>)}
          </div>
        </article>
      </section>
      <section className="admin-grid two-thirds">
        <article className="admin-panel">
          <div className="admin-panel-heading"><div><h2>Accounts needing attention</h2><p>Billing, widget, knowledge, and inactivity signals</p></div><Link href="/admin/clients">All clients</Link></div>
          <div className="admin-alert-list">
            {data.healthAlerts.map((alert) => <Link href={`/admin/clients/${alert.organizationId}`} key={alert.id}><div><strong>{alert.organizationName}</strong><small>{alert.message}</small></div><span className={`admin-severity ${alert.severity}`}>{alert.kind}</span></Link>)}
            {data.healthAlerts.length === 0 ? <p className="admin-empty">No account health alerts.</p> : null}
          </div>
        </article>
        <article className="admin-panel">
          <div className="admin-panel-heading"><div><h2>Newest clients</h2><p>Most recently created organizations</p></div></div>
          <div className="admin-compact-list">
            {data.recentClients.map((client) => <Link href={`/admin/clients/${client.organizationId}`} key={client.organizationId}><div><strong>{client.name}</strong><small>{client.plan} · {client.widgetStatus}</small></div><span className={`admin-badge ${client.health === "healthy" ? "active" : client.health === "critical" ? "past_due" : "draft"}`}>{client.health}</span></Link>)}
          </div>
        </article>
      </section>
    </div>
  );
}
