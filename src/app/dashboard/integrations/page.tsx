import Link from "next/link";
import { IntegrationsForm } from "@/components/dashboard/integrations-form";
import { IntegrationHealth, TeeTimeIntegrationsForm } from "@/components/dashboard/tee-time-integrations";
import { getWorkspaceData } from "@/lib/data/workspace";
import { isCourseLike } from "@/lib/domain/organization";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const data = await getWorkspaceData();
  const servicesWithUrls = data.services.filter((service) => service.bookingUrl).length;
  const course = isCourseLike(data.organization.type);
  const golfNow = data.bookingIntegrations.find((item) => item.provider === "golfnow");
  return (
    <div className="dashboard-page">
      <div className="dashboard-page-heading">
        <div>
          <h1>Integrations</h1>
          <p>{course ? "Lesson booking links and tee-sheet providers stay separate. Credentials never go in the widget." : "LessonLeads hands golfers off to the booking tools you already use."}</p>
        </div>
      </div>
      <div className="dashboard-grid half">
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Lessons</p><h2>Where golfers book lessons</h2></div></div>
          <IntegrationsForm initialProvider={data.coach.bookingProvider} initialUrl={data.coach.bookingUrl} />
          <small className="install-note">
            This is your default lesson booking link. Each service can override it — {servicesWithUrls} of {data.services.length} services
            currently have one. <Link href="/dashboard/services">Manage services</Link>.
          </small>
        </section>
        {course ? (
          <section className="panel">
            <div className="panel-heading"><div><p className="eyebrow">Tee times</p><h2>GolfNow and booking URLs</h2></div></div>
            <IntegrationHealth integration={golfNow ?? data.bookingIntegrations[0]} />
            <TeeTimeIntegrationsForm integrations={data.bookingIntegrations} locations={data.locations} />
            <p className="panel-copy muted">GolfNow API access has to be requested from GolfNow. Platform credentials live in server environment variables, not this form. foreUP, Lightspeed, Club Caddie, and Chronogolf can be selected now with a booking URL until API access is verified.</p>
          </section>
        ) : (
          <section className="panel">
            <div className="panel-heading"><div><p className="eyebrow">Email</p><h2>Lead notifications</h2></div></div>
            <p className="panel-copy">
              New leads and swing uploads are emailed to <strong>{data.coach.email}</strong>. Choose which alerts you get in{" "}
              <Link href="/dashboard/settings">Settings</Link>.
            </p>
            <p className="panel-copy muted">Deeper booking integrations (confirmed-booking tracking) are on the roadmap. Booking clicks are tracked today.</p>
          </section>
        )}
      </div>
    </div>
  );
}
