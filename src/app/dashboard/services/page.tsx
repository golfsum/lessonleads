import { ServiceManager } from "@/components/dashboard/service-manager";
import { getWorkspaceData } from "@/lib/data/workspace";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const data = await getWorkspaceData();
  return (
    <div className="dashboard-page">
      <div className="dashboard-page-heading">
        <div>
          <h1>Services</h1>
          <p>Lessons and programs your widget can recommend and send booking links for.</p>
        </div>
      </div>
      <ServiceManager services={data.services} />
    </div>
  );
}
