import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { requireViewer } from "@/lib/auth/session";
import { getWorkspaceData } from "@/lib/data/workspace";

export const metadata: Metadata = { title: "Workspace", robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  await requireViewer();
  const data = await getWorkspaceData();
  return <DashboardShell coachName={data.coach.name} demo={data.demo} plan={data.subscription.plan} organizationType={data.organization.type}>{children}</DashboardShell>;
}
