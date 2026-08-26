import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = { title: "Terms of Service", description: "LessonLeads terms of service.", alternates: { canonical: "/terms" } };

export default function TermsPage() {
  return <MarketingShell><article className="legal-page page-width"><h1>Terms of Service</h1><p>Last updated August 26, 2026</p><h2>The service</h2><p>LessonLeads helps golf instruction businesses qualify website visitors, recommend configured offerings, capture leads, and open coach-provided booking destinations.</p><h2>Booking status</h2><p>A booking-link click is not proof of a completed booking. Coaches are responsible for confirming booked, won, and lost outcomes unless a supported integration provides attribution.</p><h2>Customer content and conduct</h2><p>Customers are responsible for accurate offerings, valid destinations, lawful communications, required consent, and the content they publish through LessonLeads.</p><h2>Billing</h2><p>Paid plans renew until canceled. Stripe is the billing system of record. Plan limits, cancellation, and downgrade behavior are shown before purchase.</p><h2>Availability</h2><p>The current product is pre-launch software and no public service-level guarantee applies until a production agreement states one.</p><h2>Contact</h2><p>Email <a href="mailto:hello@lessonleads.com">hello@lessonleads.com</a> with terms questions.</p></article></MarketingShell>;
}
