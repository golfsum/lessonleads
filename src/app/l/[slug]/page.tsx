import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GolfWidget } from "@/components/widget/golf-widget";
import { getPublicWidget } from "@/lib/data/workspace";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const data = await getPublicWidget(slug);
  if (!data) return { title: "Coach not found" };
  return {
    title: `Ask ${data.coach.name.split(" ")[0]} about lessons | ${data.coach.businessName}`,
    description: data.widget.theme.welcomeMessage,
    robots: { index: false, follow: false },
  };
}

export default async function HostedWidgetPage({ params }: { params: Params }) {
  const { slug } = await params;
  const data = await getPublicWidget(slug);
  if (!data) notFound();
  return (
    <main className="gw-host-page">
      <div className="gw-host-stage">
        <GolfWidget data={data} />
      </div>
    </main>
  );
}
