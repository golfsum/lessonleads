import { AnnouncementsManager } from "@/components/dashboard/announcements-manager";
import { KnowledgeManager } from "@/components/dashboard/knowledge-manager";
import { getWorkspaceData } from "@/lib/data/workspace";
import { isCourseLike } from "@/lib/domain/organization";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const data = await getWorkspaceData();
  return (
    <div className="dashboard-page">
      <div className="dashboard-page-heading">
        <div>
          <h1>Knowledge</h1>
          <p>Everything the assistant is allowed to answer from. It never invents prices, availability, or policies.</p>
        </div>
      </div>
      {isCourseLike(data.organization.type) ? <AnnouncementsManager announcements={data.announcements} /> : null}
      <KnowledgeManager faqs={data.faqs} sources={data.knowledgeSources} website={data.website} />
    </div>
  );
}
