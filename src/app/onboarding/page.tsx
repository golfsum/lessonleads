import type { Metadata } from "next";
import { Logo } from "@/components/brand/logo";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { requireViewer } from "@/lib/auth/session";
import { getWorkspaceData } from "@/lib/data/workspace";

export const metadata: Metadata = { title: "Set up your widget", robots: { index: false, follow: false } };

export default async function OnboardingPage() {
  const viewer = await requireViewer();
  const data = await getWorkspaceData();
  return (
    <main className="onboarding-shell">
      <header><Logo /></header>
      <div className="onboarding-stage">
        <OnboardingFlow
          defaults={{
            coachName: data.coach.name || viewer.name || "",
            businessName: data.coach.businessName || "",
            email: data.coach.email || viewer.email || "",
            location: data.coach.location || "",
          }}
        />
      </div>
    </main>
  );
}
