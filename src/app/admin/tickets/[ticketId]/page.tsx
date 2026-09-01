import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AdminTicketControls } from "@/components/admin/ticket-controls";
import { getAdminTicket } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const dateTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

export default async function AdminTicketPage({ params }: { params: Promise<{ ticketId: string }> }) {
  await requireAdmin();
  const { ticketId } = await params;
  const ticket = await getAdminTicket(ticketId);
  if (!ticket) notFound();
  return (
    <div className="admin-page">
      <Link className="back-link" href="/admin/tickets"><ArrowLeft size={14} /> Support queue</Link>
      <div className="admin-heading"><div><h1>#{ticket.ticketNumber} {ticket.subject}</h1><p><Link href={`/admin/clients/${ticket.organizationId}`}>{ticket.organizationName}</Link> · {ticket.category.replaceAll("_", " ")} · opened {dateTime.format(new Date(ticket.createdAt))}</p></div><div className="admin-heading-badges"><span className={`admin-badge ${ticket.priority}`}>{ticket.priority}</span><span className={`admin-badge ${ticket.status}`}>{ticket.status.replaceAll("_", " ")}</span></div></div>
      <section className="admin-grid two-thirds">
        <article className="admin-panel">
          <div className="admin-panel-heading"><div><h2>Conversation</h2><p>Customer replies and internal support notes</p></div></div>
          <div className="admin-ticket-thread">
            {ticket.messages.map((message) => <article className={`${message.senderType} ${message.internal ? "internal" : ""}`} key={message.id}><div><strong>{message.internal ? "Internal note" : message.senderType === "customer" ? message.senderEmail ?? "Customer" : "LessonLeads support"}</strong><time dateTime={message.createdAt}>{dateTime.format(new Date(message.createdAt))}</time></div><p>{message.body}</p></article>)}
            {ticket.messages.length === 0 ? <p className="admin-empty">No messages on this ticket.</p> : null}
          </div>
        </article>
        <aside className="admin-panel">
          <div className="admin-panel-heading"><div><h2>Manage ticket</h2><p>Update the queue and reply</p></div></div>
          <AdminTicketControls initialPriority={ticket.priority} initialStatus={ticket.status} ticketId={ticket.id} />
        </aside>
      </section>
    </div>
  );
}
