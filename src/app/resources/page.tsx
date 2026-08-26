import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, CheckSquare, PlugZap } from "lucide-react";
import { MarketingShell, PageHero } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Resources for Golf Instructors",
  description: "Practical guides for turning a golf coach website into a better source of qualified lesson opportunities.",
  alternates: { canonical: "/resources" },
};

const resources = [
  { icon: BookOpen, href: "/resources/how-to-get-more-golf-students" as const, title: "How to get more golf students", text: "A practical guide to removing friction between website interest and the first lesson." },
  { icon: CheckSquare, href: "/resources/golf-coach-website-checklist" as const, title: "Golf coach website conversion checklist", text: "Check the pages, proof, calls to action, mobile details, and follow-up path that matter." },
  { icon: PlugZap, href: "/works-with/coachnow" as const, title: "Using LessonLeads before CoachNow", text: "Keep CoachNow for coaching or booking while qualifying website visitors first." },
];

export default function ResourcesPage() {
  return (
    <MarketingShell>
      <PageHero eyebrow="Coach resources" title="Practical ways to turn interest into lesson conversations." description="Useful guidance for golf instructors who already have a website and want more visitors to take a clear next step." />
      <section className="resource-grid page-width">
        {resources.map(({ icon: Icon, href, title, text }) => (
          <Link className="resource-card" href={href} key={href}><Icon size={23} /><h2>{title}</h2><p>{text}</p><span>Read the guide <ArrowRight size={15} /></span></Link>
        ))}
      </section>
    </MarketingShell>
  );
}
