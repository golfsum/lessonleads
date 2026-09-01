import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { MarketingShell, PageHero } from "@/components/marketing/marketing-shell";
import { plans } from "@/lib/billing/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Simple pricing for golf coaches and academies: Solo at $19/month, Pro at $39/month, and Academy at $59/month.",
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "LessonLeads pricing for golf coaches and academies",
    description: "Solo at $19/month, Pro at $39/month, and Academy at $59/month. Turn more website visitors into students.",
    url: "/pricing",
  },
};

const cards = [
  { ...plans.solo, cta: "Start with Solo" as const, href: "/signup" as const, featured: true },
  { ...plans.pro, cta: "Go Pro" as const, href: "/signup" as const, featured: false },
  { ...plans.academy, cta: "Start Academy" as const, href: "/signup" as const, featured: false },
];

const pricingStructuredData = {
  "@context": "https://schema.org",
  "@type": "OfferCatalog",
  name: "LessonLeads coach plans",
  description: "Monthly plans for independent golf coaches, video-first coaches, and multi-coach academies.",
  itemListElement: cards.map((plan) => ({
    "@type": "Offer",
    name: plan.name,
    price: String(plan.priceCents / 100),
    priceCurrency: "USD",
    url: "/signup",
  })),
};

export default function PricingPage() {
  return (
    <MarketingShell>
      <PageHero
        eyebrow="Pricing for golf coaches and academies"
        title="Turn more website visitors into students."
        description="Choose the plan that fits your coaching business. Start with the conversion tools you need, keep your existing booking system, and move up as your team grows."
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
      <section className="pricing-summary page-width" aria-labelledby="pricing-summary-title">
        <div>
          <p className="eyebrow">At a glance</p>
          <h2 id="pricing-summary-title">Simple monthly plans</h2>
        </div>
        <div className="pricing-table-wrap">
          <table className="pricing-table">
            <thead>
              <tr><th scope="col">Plan</th><th scope="col">Price</th><th scope="col">AI conversations</th></tr>
            </thead>
            <tbody>
              {cards.map((plan) => (
                <tr key={plan.id}><th scope="row">{plan.name}</th><td>{plan.priceLabel}/mo</td><td>{plan.monthlyConversations}/month</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section className="pricing-note page-width">
        <h2>What counts?</h2>
        <p>
          An AI conversation is one visitor session, not every message. Opening the widget, browsing plans, and chatting
          inside your dashboard preview do not count. Start free with no card required, then choose a paid plan when the
          widget is helping you convert more website visitors into students.
        </p>
      </section>
      <script dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingStructuredData) }} type="application/ld+json" />
    </MarketingShell>
  );
}
