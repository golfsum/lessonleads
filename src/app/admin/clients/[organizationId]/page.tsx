import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAdminClientDetail } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const dateTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export default async function AdminClientDetailPage({ params }: { params: Promise<{ organizationId: string }> }) {
  await requireAdmin();
  const { organizationId } = await params;
  const client = await getAdminClientDetail(organizationId);
  if (!client) notFound();
  return (
    <div className="admin-page">
      <Link className="back-link" href="/admin/clients"><ArrowLeft size={14} /> All clients</Link>
      <div className="admin-heading"><div><h1>{client.name}</h1><p>{client.contactName ?? "No contact name"} · {client.contactEmail ?? "No contact email"}</p></div><div className="admin-heading-badges"><span className={`admin-badge ${client.subscriptionStatus}`}>{client.plan} · {client.subscriptionStatus.replaceAll("_", " ")}</span><span className={`admin-badge ${client.widgetStatus}`}>widget {client.widgetStatus}</span></div></div>
      {client.healthReasons.length > 0 ? <aside className="admin-data-note warning"><strong>Needs attention:</strong> {client.healthReasons.join(" ")}</aside> : null}
      <section className="admin-stat-grid">
        <article className="admin-stat"><div><span>Monthly usage</span><strong>{client.monthlyUsage.conversations}</strong><small>of {client.monthlyUsage.conversationLimit} conversations</small></div></article>
        <article className="admin-stat"><div><span>Widget sessions</span><strong>{client.widgetSessions30d}</strong><small>Unique sessions in 30 days</small></div></article>
        <article className="admin-stat"><div><span>Leads</span><strong>{client.leads30d}</strong><small>{client.bookingClicks30d} booking clicks in 30 days</small></div></article>
        <article className="admin-stat"><div><span>Open tickets</span><strong>{client.totals.openTickets}</strong><small>{client.totals.conversations} lifetime conversations</small></div></article>
      </section>
      <section className="admin-detail-grid">
        <article className="admin-panel"><div className="admin-panel-heading"><div><h2>Account</h2><p>Organization and billing identifiers</p></div></div><dl className="admin-detail-list"><div><dt>Organization ID</dt><dd>{client.organizationId}</dd></div><div><dt>Created</dt><dd>{dateTime.format(new Date(client.createdAt))}</dd></div><div><dt>Members</dt><dd>{client.memberCount}</dd></div><div><dt>Website</dt><dd>{client.websiteUrl ? <a href={client.websiteUrl} rel="noreferrer" target="_blank">{client.websiteUrl}</a> : "Not set"}</dd></div><div><dt>Stripe customer</dt><dd>{client.stripeCustomerId ?? "None"}</dd></div><div><dt>Stripe subscription</dt><dd>{client.stripeSubscriptionId ?? "None"}</dd></div></dl></article>
        <article className="admin-panel"><div className="admin-panel-heading"><div><h2>Widget</h2><p>Install and health metadata</p></div></div><dl className="admin-detail-list"><div><dt>Public ID</dt><dd>{client.widgetPublicId ?? "Missing"}</dd></div><div><dt>Status</dt><dd>{client.widgetStatus}</dd></div><div><dt>Allowed sites</dt><dd>{client.allowedOrigins.length > 0 ? client.allowedOrigins.join(", ") : "Any origin"}</dd></div><div><dt>Last activity</dt><dd>{client.lastWidgetActivityAt ? dateTime.format(new Date(client.lastWidgetActivityAt)) : "No activity in 30 days"}</dd></div><div><dt>Scan status</dt><dd>{client.scanStatus}</dd></div>{client.scanError ? <div><dt>Scan error</dt><dd>{client.scanError}</dd></div> : null}</dl></article>
        <article className="admin-panel"><div className="admin-panel-heading"><div><h2>Lifetime totals</h2><p>Durable customer data</p></div></div><dl className="admin-detail-list"><div><dt>Conversations</dt><dd>{client.totals.conversations}</dd></div><div><dt>Leads</dt><dd>{client.totals.leads}</dd></div><div><dt>Widget events</dt><dd>{client.totals.widgetEvents}</dd></div><div><dt>Usage percent</dt><dd>{client.monthlyUsage.usagePercent}%</dd></div><div><dt>Monthly leads</dt><dd>{client.monthlyUsage.leads}</dd></div></dl></article>
      </section>
      <section className="admin-grid two">
        <article className="admin-panel"><div className="admin-panel-heading"><div><h2>Members</h2><p>People with workspace access</p></div></div><div className="admin-compact-list">{client.members.map((member) => <div key={member.userId}><div><strong>{member.name ?? member.email ?? member.userId}</strong><small>{member.email ?? member.userId}</small></div><span className="admin-badge free">{member.role}</span></div>)}</div></article>
        <article className="admin-panel"><div className="admin-panel-heading"><div><h2>Knowledge errors</h2><p>Failed content syncs or scans</p></div></div><div className="admin-compact-list">{client.knowledgeErrors.map((error) => <div key={error.id}><div><strong>{error.title}</strong><small>{error.error}</small></div><span className="admin-badge past_due">{error.type}</span></div>)}{client.knowledgeErrors.length === 0 ? <p className="admin-empty">No knowledge errors.</p> : null}</div></article>
      </section>
      <section className="admin-grid two">
        <article className="admin-panel"><div className="admin-panel-heading"><div><h2>Recent activity</h2><p>Last 50 widget events</p></div></div><div className="admin-compact-list">{client.recentEvents.slice(0, 12).map((event) => <div key={event.id}><div><strong>{event.name.replaceAll("_", " ")}</strong><small>Session {event.sessionId.slice(0, 12)}…</small></div><small>{dateTime.format(new Date(event.occurredAt))}</small></div>)}{client.recentEvents.length === 0 ? <p className="admin-empty">No widget activity.</p> : null}</div></article>
        <article className="admin-panel"><div className="admin-panel-heading"><div><h2>Support history</h2><p>Tickets from this organization</p></div><Link href="/admin/tickets">Full queue</Link></div><div className="admin-compact-list">{client.tickets.map((ticket) => <Link href={`/admin/tickets/${ticket.id}`} key={ticket.id}><div><strong>#{ticket.ticketNumber} {ticket.subject}</strong><small>{dateTime.format(new Date(ticket.updatedAt))}</small></div><span className={`admin-badge ${ticket.status}`}>{ticket.status.replaceAll("_", " ")}</span></Link>)}{client.tickets.length === 0 ? <p className="admin-empty">No support tickets.</p> : null}</div></article>
      </section>
    </div>
  );
}
