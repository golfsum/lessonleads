import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { GolfWidget } from "@/components/widget/golf-widget";
import { getPublicWidget } from "@/lib/data/workspace";
import { widgetOriginAllowed } from "@/lib/security/origins";

export default async function EmbedWidgetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await getPublicWidget(slug);
  if (!data) notFound();
  const headerStore = await headers();
  if (
    data.widget.allowedOrigins.length > 0 &&
    !widgetOriginAllowed({
      origin: headerStore.get("origin"),
      referrer: headerStore.get("referer"),
      allowedOrigins: data.widget.allowedOrigins,
    })
  ) {
    notFound();
  }
  return (
    <main className="gw-embed-page">
      <GolfWidget data={data} embedded />
    </main>
  );
}
