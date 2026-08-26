import type { Metadata } from "next";
import { ArrowDown, Check, Code2, Globe, Inbox, MessageCircle, Palette } from "lucide-react";
import { BottomCta, MarketingShell, PageHero } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "How LessonLeads Works",
  description: "Connect your website, let LessonLeads learn your coaching, customize your widget, paste one line of code, and turn visitors into lesson leads.",
  alternates: { canonical: "/how-it-works" },
};

const steps = [
  { icon: Globe, number: "01", title: "Connect your website", text: "Enter your URL and LessonLeads reads your public pages — services, bio, FAQ, articles. Add your YouTube channel and it learns from your videos too." },
  { icon: Palette, number: "02", title: "Customize your widget", text: "Your name, photo, colors, welcome message, and which sections visitors see: ask a question, browse lessons, watch videos, upload a swing, or contact you." },
  { icon: Code2, number: "03", title: "Paste one line of code", text: "One script tag works on WordPress, Squarespace, Wix, Webflow, and custom sites. Floating button or embedded on a dedicated page — your choice." },
  { icon: MessageCircle, number: "04", title: "It talks to your visitors", text: "Golfers ask about their slice, your rates, or junior programs. The assistant answers from your content, shows your videos, and recommends the right lesson." },
  { icon: Inbox, number: "05", title: "You get qualified leads", text: "At the right moment it asks for a name and email. You get the lead with the full conversation, an AI summary, their goals, and any swing they uploaded." },
];

export default function HowItWorksPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="How it works"
        title="From website URL to lesson leads in an afternoon."
        description="LessonLeads sits in front of the booking system you already use. It gives visitors a reason to engage, and gives you their name, email, and exactly what they need help with."
      />
      <section className="flow-section five page-width">
        {steps.map(({ icon: Icon, number, title, text }, index) => (
          <article className="flow-step" key={title}>
            <div className="flow-step-icon"><Icon size={25} /></div>
            <span>{number}</span>
            <h2>{title}</h2>
            <p>{text}</p>
            {index < steps.length - 1 ? <ArrowDown className="flow-arrow" size={20} /> : null}
          </article>
        ))}
      </section>
      <section className="compare-section page-width">
        <div className="compare-card muted">
          <p className="eyebrow">Website without LessonLeads</p>
          <h2>Visitors read, wonder, and leave</h2>
          <ul><li>Questions go unanswered until you reply to an email</li><li>Your videos sit on YouTube, disconnected from your site</li><li>No trace of the golfer who almost booked</li></ul>
        </div>
        <div className="compare-card preferred">
          <p className="eyebrow">Website with LessonLeads</p>
          <h2>Every visitor gets a next step</h2>
          <ul><li><Check size={16} /> Questions answered instantly, in your voice, from your content</li><li><Check size={16} /> Your videos recommended exactly when they&apos;re relevant</li><li><Check size={16} /> Qualified leads with context, even if they don&apos;t book today</li></ul>
        </div>
      </section>
      <BottomCta />
    </MarketingShell>
  );
}
