import { LeadList } from "@/components/dashboard/lead-list";
import { getWorkspaceData } from "@/lib/data/workspace";

export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const data = await getWorkspaceData();
  const highIntent = data.leads.filter((lead) => lead.intentLevel === "high").length;
  return (
    <div className="dashboard-page">
      <div className="dashboard-page-heading">
        <div>
          <h1>Leads</h1>
          <p>{data.leads.length} golfers captured &middot; {highIntent} high intent</p>
        </div>
      </div>
      <LeadList initialLeads={data.leads} swingUploads={data.swingUploads} />
    </div>
  );
}
