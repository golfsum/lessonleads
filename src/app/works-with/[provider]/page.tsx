import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Check, ExternalLink } from "lucide-react";
import { BottomCta, MarketingShell } from "@/components/marketing/marketing-shell";

const providers = {
  coachnow: { name: "CoachNow", use: "coaching, communication, programs, or a coach-provided booking link", disclaimer: "LessonLeads is not affiliated with or endorsed by CoachNow." },
  calendly: { name: "Calendly", use: "calendar availability and booking", disclaimer: "LessonLeads is not affiliated with or endorsed by Calendly." },
  acuity: { name: "Acuity Scheduling", use: "availability, booking, and payments", disclaimer: "LessonLeads is not affiliated with or endorsed by Acuity Scheduling." },
  square: { name: "Square", use: "appointments and payments", disclaimer: "LessonLeads is not affiliated with or endorsed by Square." },
} as const;

type Provider = keyof typeof providers;
type Props = { params: Promise<{ provider: string }> };
export function generateStaticParams() { return Object.keys(providers).map((provider) => ({ provider })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { provider } = await params;
  const item = providers[provider as Provider];
  if (!item) return {};
  return { title: `LessonLeads with ${item.name} booking links`, description: `Qualify golf lesson visitors before sending them to a ${item.name} booking link.`, alternates: { canonical: `/works-with/${provider}` } };
}

export default async function ProviderPage({ params }: Props) {
  const { provider } = await params;
  const item = providers[provider as Provider];
  if (!item) notFound();
  return (
    <MarketingShell>
      <section className="provider-page page-width">
        <p className="eyebrow">Works before your booking link</p>
        <h1>Use LessonLeads before {item.name}.</h1>
        <p>Keep {item.name} for {item.use}. Add LessonLeads to your website to answer golfers&apos; questions, recommend the right lesson, and capture the lead before opening that destination.</p>
        <div className="provider-flow"><span>Website visitor</span><ExternalLink size={18} /><span>LessonLeads conversation</span><ExternalLink size={18} /><span>{item.name} booking link</span></div>
        <ul><li><Check size={17} /> Paste the coach-provided destination URL</li><li><Check size={17} /> Save the lead before redirect</li><li><Check size={17} /> Record a booking-link click, not an unverified booking</li></ul>
        <small>{item.disclaimer} A link handoff is not an API integration.</small>
      </section>
      <BottomCta />
    </MarketingShell>
  );
}
