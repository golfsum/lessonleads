import { KnowledgeManager } from "@/components/dashboard/knowledge-manager";
import { getWorkspaceData } from "@/lib/data/workspace";

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
      <KnowledgeManager faqs={data.faqs} sources={data.knowledgeSources} website={data.website} />
    </div>
  );
}
