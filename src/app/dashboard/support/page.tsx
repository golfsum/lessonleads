import Link from "next/link";
import { LifeBuoy, MessageSquareText } from "lucide-react";
import { SupportTicketForm } from "@/components/dashboard/support-ticket-form";
import { requireViewer } from "@/lib/auth/session";
import { getCustomerTickets, type SupportTicketStatus } from "@/lib/support/tickets";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const statusLabels: Record<SupportTicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  waiting_on_customer: "Waiting on you",
  resolved: "Resolved",
  closed: "Closed",
};

export default async function SupportPage() {
  const viewer = await requireViewer();
  const tickets = viewer?.demo ? [] : await getCustomerTickets();
  return (
    <div className="dashboard-page">
      <div className="dashboard-page-heading">
        <div><h1>Support</h1><p>Send LessonLeads a question or report an issue. Replies stay organized with your account.</p></div>
      </div>
      <section className="support-layout">
        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">New ticket</p><h2>How can we help?</h2></div><LifeBuoy size={20} /></div>
          <SupportTicketForm disabled={Boolean(viewer?.demo)} />
        </article>
        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Your history</p><h2>Support tickets</h2></div><MessageSquareText size={20} /></div>
          <div className="ticket-list">
            {tickets.map((ticket) => (
              <Link href={`/dashboard/support/${ticket.id}`} key={ticket.id}>
                <div><strong>#{ticket.number} {ticket.subject}</strong><small>{ticket.category.replaceAll("_", " ")} · updated {dateFormat.format(new Date(ticket.updatedAt))}</small></div>
                <span className={`ticket-status ${ticket.status}`}>{statusLabels[ticket.status]}</span>
              </Link>
            ))}
            {tickets.length === 0 ? <p className="empty-hint">No support tickets yet.</p> : null}
          </div>
        </article>
      </section>
    </div>
  );
}
