import type { Metadata } from "next";
import { SeoTopicPage } from "@/components/marketing/seo-topic-page";

export const metadata: Metadata = {
  title: "AI Website Assistant for Golf Coaches",
  description: "Turn your golf website into more lesson leads. An AI widget trained on your coaching content that answers questions, captures qualified leads, and hands off to your booking system.",
  alternates: { canonical: "/for/golf-coaches" },
};

export default function GolfCoachesForPage() {
  return (
    <SeoTopicPage
      topic={{
        eyebrow: "LessonLeads for golf coaches",
        title: "Turn your golf website into more lesson leads.",
        description: "LessonLeads answers visitor questions from your own content, recommends the right lesson, and captures the golfer before they leave.",
        contextTitle: "Most golfers leave a coach's website without ever making contact.",
        context: "They have a real question about their slice, your rates, or whether you teach juniors, but the answer is buried or sitting in a YouTube video they never find. LessonLeads answers instantly from your own content and turns that moment into a lesson lead.",
        sections: [
          { title: "Answers in your voice", body: "The assistant learns from your website, FAQ, videos, and notes. When a golfer asks why they slice, they hear your take on it, not generic internet advice." },
          { title: "Recommends real lessons", body: "It matches the golfer's stated problem to your actual services and shows the one that fits, with your price and your booking link." },
          { title: "Keeps your current tools", body: "After capturing the lead, it sends the golfer to your CoachNow, Calendly, Acuity, Square, or club-site booking page." },
        ],
        checklist: [
          "Give useful help before asking for contact details",
          "Capture the golfer before the external handoff",
          "Only answer factual questions from your approved content",
          "Work comfortably on a phone",
        ],
        relatedHref: "/demo",
        relatedLabel: "See the coach widget demo",
      }}
    />
  );
}
