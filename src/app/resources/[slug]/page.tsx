import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Check } from "lucide-react";
import { BottomCta, MarketingShell } from "@/components/marketing/marketing-shell";

const guides = {
  "how-to-get-more-golf-students": {
    title: "How to get more golf students from the website you already have",
    description: "A practical conversion guide for golf instructors who want more useful lesson inquiries without replacing their current systems.",
    intro: "Most golf coach websites do not have a traffic problem first. They have a decision problem. An interested golfer arrives, sees several lesson options, and has to guess what to book.",
    sections: [
      ["Give ready golfers a direct path", "Keep a clear book-now option for golfers who already know what they want. A widget should help unsure visitors, not force every visitor through extra steps."],
      ["Answer the lesson-choice question", "Explain who each offering is for, then ask only the few questions needed to recommend a sensible starting point."],
      ["Show value before asking for contact details", "A recommendation earns the right to ask for follow-up information. Do not hide all value behind an email gate."],
      ["Capture before the external handoff", "Save the golfer and their answers before opening the booking link. Track the click honestly, then let the coach confirm booked, won, or lost."],
      ["Measure qualified golfers, not page views", "Starts are useful, but the business outcome is a prospect the coach can help. Report leads captured and manually confirmed students."],
    ],
  },
  "golf-coach-website-checklist": {
    title: "Golf coach website conversion checklist",
    description: "A concise review of the pages and interactions that help a golf instructor turn website interest into lesson conversations.",
    intro: "Use this checklist on a phone first. That is where many golfers will arrive from Instagram, Google Business Profile, a QR code, or a club staff page.",
    sections: [
      ["Clear first screen", "State who you coach, where you teach, the outcome you help with, and the primary next step without making the golfer hunt."],
      ["Specific lesson descriptions", "Name the golfer, problem, format, duration, and price where possible. Avoid vague service cards."],
      ["Two intentional paths", "Offer direct booking for ready golfers and guided help for golfers who are unsure which lesson is right."],
      ["Reachable mobile controls", "Use large tap targets, readable labels, no sideways scrolling, and no form fields hidden by the keyboard."],
      ["Follow-up-ready capture", "Save contact details with useful golf context and a clear consent statement before handing off to another system."],
      ["Truthful measurement", "Separate a booking-link click from a confirmed booking unless the destination reports completion back."],
    ],
  },
} as const;

type GuideSlug = keyof typeof guides;
type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() { return Object.keys(guides).map((slug) => ({ slug })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = guides[slug as GuideSlug];
  if (!guide) return {};
  return { title: guide.title, description: guide.description, alternates: { canonical: `/resources/${slug}` } };
}

export default async function ResourceGuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = guides[slug as GuideSlug];
  if (!guide) notFound();
  return (
    <MarketingShell>
      <article className="article-page page-width">
        <Link className="article-back" href="/resources">Resources</Link>
        <h1>{guide.title}</h1>
        <p className="article-intro">{guide.intro}</p>
        <div className="article-sections">
          {guide.sections.map(([title, text]) => <section key={title}><Check size={20} /><div><h2>{title}</h2><p>{text}</p></div></section>)}
        </div>
        <Link className="article-next" href="/demo">See the golfer experience <ArrowRight size={16} /></Link>
      </article>
      <BottomCta />
    </MarketingShell>
  );
}
