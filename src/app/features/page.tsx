import type { Metadata } from "next";
import { BarChart3, Bell, BookOpen, Code2, ExternalLink, Globe, Inbox, MessageCircle, Palette, ShieldCheck, Smartphone, Upload, Video } from "lucide-react";
import { BottomCta, MarketingShell, PageHero } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = {
  title: "Golf Coaching Widget Features",
  description: "An assistant trained on your coaching content, swing upload leads, service recommendations, a lead CRM, and one-line installation on any website.",
  alternates: { canonical: "/features" },
};

const features = [
  { icon: MessageCircle, title: "Trained on your coaching", text: "The assistant learns from your website, FAQ, videos, and notes — so answers reflect what you teach, not generic golf tips." },
  { icon: Globe, title: "Website import", text: "Enter your URL once. LessonLeads finds your services, bio, FAQ, and articles, and keeps them in sync when your site changes." },
  { icon: Video, title: "YouTube import", text: "Paste your channel and your videos become searchable. When a visitor's question matches one, the widget shows it." },
  { icon: Upload, title: "Swing upload leads", text: "Visitors send a swing video with their goal and typical miss. You get a high-intent lead with the full story attached." },
  { icon: BookOpen, title: "Smart lesson recommendations", text: "The widget matches each golfer's need to your actual services — the right lesson for the stated problem, not the priciest one." },
  { icon: ExternalLink, title: "Booking-link handoff", text: "Keep Calendly, CoachNow, Acuity, Square, or your club site. LessonLeads sends golfers there and records the click." },
  { icon: Inbox, title: "Lead CRM with summaries", text: "Every lead arrives with the conversation, an AI summary, intent level, interests, and swing uploads. Statuses from New to Won." },
  { icon: Palette, title: "Looks like your brand", text: "Your name, photo, colors, welcome message, and menu labels. Visitors see your coaching product, not a generic chatbot." },
  { icon: Code2, title: "One-line install", text: "A single script tag with your coach ID. Floating button or full-page embed, on WordPress, Squarespace, Wix, Webflow, or custom sites." },
  { icon: BarChart3, title: "Conversion analytics", text: "Widget opens, conversations, leads, swing uploads, and booking clicks in one funnel — so you know what your traffic produces." },
  { icon: Bell, title: "Lead notifications", text: "A concise email the moment a lead is captured, a swing is uploaded, or a high-intent golfer appears. You choose what's worth an alert." },
  { icon: ShieldCheck, title: "Grounded and honest", text: "Prices, policies, and locations come only from your approved content. When it doesn't know, it says so and offers your contact info." },
  { icon: Smartphone, title: "Built for phones", text: "Golfers arrive from Instagram and YouTube. The widget opens full-screen on mobile, and swing uploads work straight from the camera roll." },
];

export default function FeaturesPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Product features"
        title="Everything between a website visit and a booked lesson."
        description="LessonLeads stays focused on one job: turn the golfers already visiting your website into qualified leads you can coach."
      />
      <section className="feature-grid page-width">
        {features.map(({ icon: Icon, title, text }) => (
          <article className="feature-card" key={title}><Icon size={24} /><h2>{title}</h2><p>{text}</p></article>
        ))}
      </section>
      <BottomCta />
    </MarketingShell>
  );
}
