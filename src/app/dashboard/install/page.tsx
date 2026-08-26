import { headers } from "next/headers";
import { InstallPanel } from "@/components/dashboard/install-panel";
import { getWorkspaceData } from "@/lib/data/workspace";

export const dynamic = "force-dynamic";

async function appOrigin() {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? (host?.includes("localhost") || host?.startsWith("127.") ? "http" : "https");
  if (host) return `${proto}://${host}`;
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export default async function InstallPage() {
  const data = await getWorkspaceData();
  const appUrl = await appOrigin();
  return (
    <div className="dashboard-page">
      <div className="dashboard-page-heading">
        <div>
          <h1>Install</h1>
          <p>Add the widget to your website, or share the hosted link anywhere.</p>
        </div>
      </div>
      <InstallPanel appUrl={appUrl} publicId={data.widget.publicId} slug={data.widget.slug} website={data.website.url ?? data.coach.website ?? ""} />
    </div>
  );
}
