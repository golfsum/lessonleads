import Link from "next/link";
import { getAdminClients } from "@/lib/admin/data";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function AdminClientsPage() {
  await requireAdmin();
  const clients = await getAdminClients();
  return (
    <div className="admin-page">
      <div className="admin-heading"><div><h1>Clients</h1><p>Plan, widget usage, lead activity, and health for every customer organization.</p></div></div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th>Client</th><th>Plan</th><th>Widget</th><th className="numeric">Sessions</th><th className="numeric">Conversations</th><th className="numeric">Leads</th><th className="numeric">Booking clicks</th><th>Last activity</th><th>Health</th></tr></thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.organizationId}>
                <td><Link href={`/admin/clients/${client.organizationId}`}>{client.name}</Link><small>{client.contactEmail ?? client.slug}</small></td>
                <td><span className={`admin-badge ${client.subscriptionStatus}`}>{client.plan}</span><small>{client.subscriptionStatus.replaceAll("_", " ")}</small></td>
                <td><span className={`admin-badge ${client.widgetStatus}`}>{client.widgetStatus}</span><small>{client.widgetPublicId ?? "No public ID"}</small></td>
                <td className="numeric">{client.widgetSessions30d}</td><td className="numeric">{client.conversations30d}</td><td className="numeric">{client.leads30d}</td><td className="numeric">{client.bookingClicks30d}</td>
                <td>{client.lastWidgetActivityAt ? dateFormat.format(new Date(client.lastWidgetActivityAt)) : "No activity"}</td>
                <td><span className={`admin-badge ${client.health === "healthy" ? "active" : client.health === "critical" ? "past_due" : "draft"}`}>{client.health}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {clients.length === 0 ? <p className="admin-empty">No client organizations found.</p> : null}
      </div>
    </div>
  );
}
