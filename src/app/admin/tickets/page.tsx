import Link from "next/link";
import { getAdminTickets } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const dateTime = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default async function AdminTicketsPage() {
  await requireAdmin();
  const tickets = await getAdminTickets();
  return (
    <div className="admin-page">
      <div className="admin-heading"><div><h1>Support queue</h1><p>Customer issues, installation questions, billing requests, and product feedback.</p></div></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Ticket</th><th>Client</th><th>Category</th><th>Priority</th><th>Status</th><th>Updated</th></tr></thead><tbody>{tickets.map((ticket) => <tr key={ticket.id}><td><Link href={`/admin/tickets/${ticket.id}`}>#{ticket.ticketNumber} {ticket.subject}</Link><small>Opened {dateTime.format(new Date(ticket.createdAt))}</small></td><td><Link href={`/admin/clients/${ticket.organizationId}`}>{ticket.organizationName}</Link></td><td className="capitalize">{ticket.category.replaceAll("_", " ")}</td><td><span className={`admin-badge ${ticket.priority}`}>{ticket.priority}</span></td><td><span className={`admin-badge ${ticket.status}`}>{ticket.status.replaceAll("_", " ")}</span></td><td>{dateTime.format(new Date(ticket.updatedAt))}</td></tr>)}</tbody></table>{tickets.length === 0 ? <p className="admin-empty">No support tickets.</p> : null}</div>
    </div>
  );
}
