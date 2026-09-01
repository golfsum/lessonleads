import { StaffManager } from "@/components/dashboard/staff-manager";
import { getWorkspaceData } from "@/lib/data/workspace";

export const dynamic = "force-dynamic";

export default async function StaffPage() {
  const data = await getWorkspaceData();
  return (
    <div className="dashboard-page">
      <div className="dashboard-page-heading">
        <div>
          <h1>Golf Staff</h1>
          <p>Teaching professionals visitors can be matched to from the widget.</p>
        </div>
      </div>
      <StaffManager staff={data.staff} />
    </div>
  );
}
