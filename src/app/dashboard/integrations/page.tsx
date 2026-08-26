import Link from "next/link";
import { IntegrationsForm } from "@/components/dashboard/integrations-form";
import { getWorkspaceData } from "@/lib/data/workspace";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const data = await getWorkspaceData();
  const servicesWithUrls = data.services.filter((service) => service.bookingUrl).length;
  return (
    <div className="dashboard-page">
      <div className="dashboard-page-heading">
        <div>
          <h1>Integrations</h1>
          <p>LessonLeads hands golfers off to the booking tools you already use.</p>
        </div>
      </div>
      <div className="dashboard-grid half">
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Booking</p><h2>Where golfers book with you</h2></div></div>
          <IntegrationsForm initialProvider={data.coach.bookingProvider} initialUrl={data.coach.bookingUrl} />
          <small className="install-note">
            This is your default booking link. Each service can override it with its own URL — {servicesWithUrls} of {data.services.length} services
            currently have one. <Link href="/dashboard/services">Manage services</Link>.
          </small>
        </section>
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Email</p><h2>Lead notifications</h2></div></div>
          <p className="panel-copy">
            New leads and swing uploads are emailed to <strong>{data.coach.email}</strong>. Choose which alerts you get in{" "}
            <Link href="/dashboard/settings">Settings</Link>.
          </p>
          <p className="panel-copy muted">Deeper booking integrations (confirmed-booking tracking) are on the roadmap. Booking clicks are tracked today.</p>
        </section>
      </div>
    </div>
  );
}
