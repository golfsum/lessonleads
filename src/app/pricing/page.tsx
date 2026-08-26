import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { MarketingShell, PageHero } from "@/components/marketing/marketing-shell";
import { plans } from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Try LessonLeads on your website for free. Upgrade to Solo for $29/month when the widget starts sending you golfers.",
  alternates: { canonical: "/pricing" },
};

const cards = [
  { ...plans.free, cta: "Start free" as const, href: "/signup" as const, featured: false },
  { ...plans.solo, cta: "Start with Solo" as const, href: "/signup" as const, featured: true },
  { ...plans.pro, cta: "Start with Pro" as const, href: "/signup" as const, featured: false },
];

export default function PricingPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Simple pricing"
        title="Free until it starts working. Then $29."
        description="Try the widget on your site. If a handful of golfers turn into leads, Solo already pays for itself. Preview and testing in your dashboard never count."
        action={false}
      />
      <section className="pricing-grid three page-width">
        {cards.map((plan) => (
          <article className={`pricing-card${plan.featured ? " featured" : ""}`} key={plan.name}>
            <p className="eyebrow">{plan.name}</p>
            <div className="plan-price">
              <strong>{plan.priceLabel}</strong>
              <span>{plan.priceNote}</span>
            </div>
            <p>{plan.description}</p>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>
                  <Check size={16} /> {feature}
                </li>
              ))}
            </ul>
            <Link className={`button ${plan.featured ? "button-primary" : "button-secondary"}`} href={plan.href}>
              {plan.cta}
            </Link>
          </article>
        ))}
      </section>
      <section className="pricing-note page-width">
        <h2>What counts?</h2>
        <p>
          A visitor conversation is counted when someone on your website sends their first message. Opening the widget,
          browsing lessons, and chatting inside your dashboard preview do not count. When Free hits its cap, the upgrade
          is about the golfers you already captured, not tokens.
        </p>
      </section>
    </MarketingShell>
  );
}
