import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { SupportTicketReply } from "@/components/dashboard/support-ticket-reply";
import { getCustomerTicket, type SupportTicketStatus } from "@/lib/support/tickets";
import { requireViewer } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const dateTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
const statusLabels: Record<SupportTicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  waiting_on_customer: "Waiting on you",
  resolved: "Resolved",
  closed: "Closed",
};

export default async function SupportTicketPage({ params }: { params: Promise<{ ticketId: string }> }) {
  await requireViewer();
  const { ticketId } = await params;
  const ticket = await getCustomerTicket(ticketId);
  if (!ticket) notFound();
  return (
    <div className="dashboard-page">
      <Link className="back-link" href="/dashboard/support"><ArrowLeft size={14} /> All support tickets</Link>
      <div className="lead-detail-heading">
        <div><div><h1>#{ticket.number} {ticket.subject}</h1><p className="capitalize">{ticket.category.replaceAll("_", " ")} · opened {dateTime.format(new Date(ticket.createdAt))}</p></div></div>
        <span className={`ticket-status ${ticket.status}`}>{statusLabels[ticket.status]}</span>
      </div>
      <section className="ticket-thread panel" aria-label="Support conversation">
        {(ticket.messages ?? []).map((message) => (
          <article className={message.senderType} key={message.id}>
            <div><strong>{message.senderType === "customer" ? "You" : "LessonLeads support"}</strong><time dateTime={message.createdAt}>{dateTime.format(new Date(message.createdAt))}</time></div>
            <p>{message.body}</p>
          </article>
        ))}
      </section>
      <section className="panel"><SupportTicketReply closed={ticket.status === "closed"} ticketId={ticket.id} /></section>
    </div>
  );
}
