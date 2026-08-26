import { WidgetBuilder } from "@/components/dashboard/widget-builder";
import { getWorkspaceData } from "@/lib/data/workspace";
import { toPublicWidget } from "@/lib/demo/store";

export const dynamic = "force-dynamic";

export default async function WidgetPage() {
  const data = await getWorkspaceData();
  // Build the preview payload directly from workspace data so draft widgets preview too.
  const publicWidget = toPublicWidget(data);
  return (
    <div className="dashboard-page">
      <div className="dashboard-page-heading">
        <div>
          <h1>Widget</h1>
          <p>Customize the experience visitors get on your website. Changes go live when you save.</p>
        </div>
      </div>
      <WidgetBuilder publicWidget={publicWidget} />
    </div>
  );
}
