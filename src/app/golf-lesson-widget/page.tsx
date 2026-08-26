import type { Metadata } from "next";
import { Code2, Link2, MousePointerClick } from "lucide-react";
import { BottomCta, MarketingShell, PageHero } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Golf Lesson Widget",
  description: "Add an AI coaching assistant and lead capture widget to an existing golf coach website with one script tag.",
  alternates: { canonical: "/golf-lesson-widget" },
};

export default function GolfLessonWidgetPage() {
  return (
    <MarketingShell>
      <PageHero eyebrow="Golf lesson widget" title="Add a coaching assistant to the website you already have." description="LessonLeads answers golfers' questions from your content, captures qualified leads, and hands off to your booking page. It is not a calendar or payment system." />
      <section className="feature-grid page-width three">
        <article className="feature-card"><MousePointerClick size={24} /><h2>Floating button</h2><p>An &ldquo;Ask Coach Mike&rdquo; launcher in the corner of your site opens the full widget: chat, lessons, videos, and swing upload.</p></article>
        <article className="feature-card"><Code2 size={24} /><h2>Inline embed</h2><p>Place the complete experience inside a dedicated ask, coaching, or get-help page on your site.</p></article>
        <article className="feature-card"><Link2 size={24} /><h2>Hosted link</h2><p>Share the same widget through a hosted page in social profiles, emails, QR codes, and Google Business Profile.</p></article>
      </section>
      <BottomCta />
    </MarketingShell>
  );
}
