import { IntegrationHealth, TeeTimeIntegrationsForm } from "@/components/dashboard/tee-time-integrations";
import { getWorkspaceData } from "@/lib/data/workspace";
import { calculateAnalytics } from "@/lib/analytics";

export const dynamic = "force-dynamic";

export default async function TeeTimesPage() {
  const data = await getWorkspaceData();
  const analytics = calculateAnalytics(data);
  const integration = data.bookingIntegrations[0];
  return (
    <div className="dashboard-page">
      <div className="dashboard-page-heading">
        <div>
          <h1>Tee Times</h1>
          <p>Connect a booking URL now. Live availability is added when a provider API is actually connected. A booking click is not a confirmed booking.</p>
        </div>
      </div>
      <section className="stat-grid">
        <article><div><span>Tee time searches</span><strong>{analytics.teeTimeSearches}</strong></div></article>
        <article><div><span>Results shown</span><strong>{analytics.teeTimeResults}</strong></div></article>
        <article><div><span>Booking clicks</span><strong>{analytics.teeTimeBookingClicks}</strong></div></article>
      </section>
      <div className="dashboard-grid half">
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Provider</p><h2>How golfers reach a tee sheet</h2></div></div>
          <TeeTimeIntegrationsForm integrations={data.bookingIntegrations} locations={data.locations} />
        </section>
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Health</p><h2>{integration ? "Integration status" : "Not connected"}</h2></div></div>
          <IntegrationHealth integration={integration} />
          {integration?.status === "error" ? <p className="form-error" role="status">Action required. Live search failed recently. Golfers still see the booking page handoff.</p> : null}
        </section>
      </div>
    </div>
  );
}
