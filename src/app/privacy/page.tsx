import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/marketing-shell";

export const metadata: Metadata = { title: "Privacy Policy", description: "LessonLeads privacy policy.", alternates: { canonical: "/privacy" } };

export default function PrivacyPage() {
  return <MarketingShell><article className="legal-page page-width"><h1>Privacy Policy</h1><p>Last updated August 26, 2026</p><h2>What LessonLeads collects</h2><p>LessonLeads processes coach account information, configured lesson content and knowledge sources, golfer contact details, widget conversations, swing uploads, widget events, booking-link clicks, and billing state needed to operate the service.</p><h2>How information is used</h2><p>Information is used to provide recommendations, deliver qualified leads to the relevant coach, operate the workspace, prevent abuse, improve reliability, and manage billing. LessonLeads does not sell golfer contact information.</p><h2>Coach responsibilities</h2><p>Each coach is responsible for an appropriate privacy notice and consent language for their business and jurisdiction. The coach controls their leads and follow-up.</p><h2>Retention and deletion</h2><p>Coaches can request account deletion and remove customer records. Production retention periods must be configured before launch and reflected in customer agreements.</p><h2>Contact</h2><p>Email <a href="mailto:privacy@lessonleads.com">privacy@lessonleads.com</a> with privacy or deletion questions.</p></article></MarketingShell>;
}
