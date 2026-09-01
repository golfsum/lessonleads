import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { HomeDemo } from "@/components/marketing/home-demo";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "See the Widget in Action",
  description: "Try a scripted preview of the LessonLeads widget: grounded answers, video recommendations, and lesson suggestions from a coach's own content.",
  alternates: { canonical: "/demo" },
};

export default function DemoPage() {
  return (
    <MarketingShell>
      <section className="demo-page page-width">
        <div className="demo-page-copy">
          <p className="eyebrow">Widget preview</p>
          <h1>See what a golfer experiences on your site.</h1>
          <p>
            This is a scripted preview using an example coach. Your real widget answers freely from your own website, videos,
            and FAQ — and captures the lead when the golfer is ready. Looking for a course?{" "}
            <Link href={"/demo/course" as Route}>Try the golf course demo</Link>.
          </p>
          <ul>
            <li><CheckCircle2 size={17} /> Answers grounded in the coach&apos;s content</li>
            <li><CheckCircle2 size={17} /> Videos and lessons recommended in context</li>
            <li><CheckCircle2 size={17} /> Nothing is saved and no booking link opens</li>
          </ul>
        </div>
        <HomeDemo />
      </section>
    </MarketingShell>
  );
}
