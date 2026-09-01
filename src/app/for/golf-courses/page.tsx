import type { Metadata } from "next";
import type { Route } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Flag, Inbox, MessageCircle, Users, Video } from "lucide-react";
import { BottomCta, MarketingShell, PageHero } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "AI Website Assistant for Golf Courses",
  description:
    "Answer golfer questions automatically, help visitors find tee times, capture tournament and membership inquiries, and send golfers to the right service.",
  alternates: { canonical: "/for/golf-courses" },
};

const sections = [
  { icon: CalendarDays, title: "Find tee times", body: "Golfers can ask for a morning foursome in plain language. If a live provider is connected, LessonLeads searches it. If not, the widget still hands them to your booking page." },
  { icon: MessageCircle, title: "Reduce repetitive calls", body: "Green fees, carts, walking, dress code, range hours, and restaurant questions get answered from your own pages and FAQs." },
  { icon: Flag, title: "Capture tournament leads", body: "A company outing for 80 people is worth more than one tee time. The widget collects date, players, company, and contact details." },
  { icon: Users, title: "Generate membership inquiries", body: "When membership prices are in your approved knowledge, the widget can share them. If they are not, it says so and offers a follow-up." },
  { icon: Video, title: "Promote lessons", body: "Courses with teaching professionals can add staff bios, lesson types, and booking links. The widget recommends the right pro." },
  { icon: Inbox, title: "Answer course FAQs", body: "Rates, policies, practice, dining, and events stay in one knowledge base you can approve, mark as frequently changing, and override with announcements." },
];

export default function GolfCoursesPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="LessonLeads for golf courses"
        title="Turn more golf course website visits into tee times and leads."
        description="Answer golfer questions automatically, help visitors find available tee times, capture tournament and membership inquiries, and send golfers to the right service."
      />
      <section className="seo-topic page-width">
        <article className="seo-context">
          <p className="eyebrow">Built for golf, not generic chat</p>
          <h2>A foursome around 8 tomorrow is a real request. The widget should treat it like one.</h2>
          <p>
            LessonLeads stays one product. A course gets different defaults than a coach: Ask, Tee Times, Course, Lessons, and Events.
            Live tee-sheet APIs are added when access is actually available. A booking URL is enough to launch.
          </p>
        </article>
        <div className="seo-topic-grid">
          {sections.map(({ icon: Icon, title, body }) => (
            <article key={title}><Icon size={22} /><h2>{title}</h2><p>{body}</p></article>
          ))}
        </div>
        <p className="seo-note">
          We do not claim a live GolfNow, foreUP, Lightspeed, or Club Caddie feed until that course has connected access.
          Demo tee times are labeled as demo availability.
        </p>
        <Link className="article-next" href={"/demo/course" as Route}>Try the golf course demo <ArrowRight size={16} /></Link>
      </section>
      <BottomCta />
    </MarketingShell>
  );
}
