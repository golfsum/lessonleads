import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { GolfWidget } from "@/components/widget/golf-widget";
import { MarketingShell } from "@/components/marketing/marketing-shell";
import { getPublicWidget } from "@/lib/data/workspace";
import { COURSE_DEMO_PUBLIC_ID } from "@/lib/course-demo/ids";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Golf Course Widget Demo",
  description: "Try a golf course LessonLeads widget: course FAQs, membership questions, tournament inquiries, and labeled demo tee times.",
  alternates: { canonical: "/demo/course" },
};

export default async function CourseDemoPage() {
  const data = await getPublicWidget(COURSE_DEMO_PUBLIC_ID);
  if (!data) {
    return (
      <MarketingShell>
        <section className="demo-page page-width">
          <p>The course demo is unavailable right now.</p>
        </section>
      </MarketingShell>
    );
  }
  return (
    <MarketingShell>
      <section className="demo-page page-width">
        <div className="demo-page-copy">
          <p className="eyebrow">Golf course demo</p>
          <h1>Ask a course widget the questions golfers actually ask.</h1>
          <p>
            This is a live demo of Desert Fairways Golf Club. Tee times are labeled demo availability, not a real tee sheet.
            Try a FAQ, a membership question, a tournament inquiry, or a tee-time search.
          </p>
          <ul>
            <li><CheckCircle2 size={17} /> &ldquo;Any tee times tomorrow morning?&rdquo;</li>
            <li><CheckCircle2 size={17} /> &ldquo;How much is a membership?&rdquo;</li>
            <li><CheckCircle2 size={17} /> &ldquo;Do you have club rentals?&rdquo;</li>
            <li><CheckCircle2 size={17} /> &ldquo;Can I host a tournament?&rdquo;</li>
          </ul>
        </div>
        <div className="gw-host-stage">
          <GolfWidget data={data} />
        </div>
      </section>
    </MarketingShell>
  );
}
