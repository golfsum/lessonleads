import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, Inbox, MessageCircle, Play, ShieldCheck, Upload, Video } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { HomeDemo } from "@/components/marketing/home-demo";
import { BottomCta, MarketingFooter } from "@/components/marketing/marketing-shell";
import { MobileMenu } from "@/components/marketing/mobile-menu";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "LessonLeads",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "An embeddable widget for golf coaches that answers visitor questions from the coach's own content, captures qualified leads, and hands them to the coach's booking system.",
  offers: [
    { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
    { "@type": "Offer", name: "Solo", price: "29", priceCurrency: "USD" },
    { "@type": "Offer", name: "Pro", price: "79", priceCurrency: "USD" },
  ],
};

const setupSteps = [
  { number: "1", title: "Connect your website", text: "LessonLeads scans your public pages, FAQ, and services." },
  { number: "2", title: "It learns your coaching", text: "Your bio, philosophy, videos, and answers become its knowledge." },
  { number: "3", title: "Customize your widget", text: "Your name, colors, sections, and welcome message." },
  { number: "4", title: "Paste one line of code", text: "Works on WordPress, Squarespace, Wix, Webflow, and custom sites." },
  { number: "5", title: "Turn visitors into leads", text: "Qualified golfers land in your dashboard with full context." },
];

const valueProps = [
  { icon: MessageCircle, title: "Answers like you would", text: "Visitors ask about their slice, your rates, or junior lessons — and get answers grounded in your website, videos, and FAQ. Never generic golf advice." },
  { icon: Video, title: "Puts your videos to work", text: "When a question matches something you've already covered on YouTube, the widget shows that video. Your existing content finally earns leads." },
  { icon: Upload, title: "Swing uploads from your site", text: "Golfers can send you their swing right from the widget — a phone video and their goal. You get a high-intent lead, not an anonymous view." },
  { icon: Inbox, title: "A lead inbox with context", text: "Every lead arrives with the conversation, an AI summary, their goals, and the lesson they were pointed to. No more cold inquiries." },
  { icon: BookOpen, title: "Recommends the right lesson", text: "The widget matches each golfer's need to your actual services and sends them to the booking link you already use — Calendly, CoachNow, Acuity, or your own site." },
  { icon: ShieldCheck, title: "Honest by design", text: "It only answers from your approved content. If it doesn't know your cancellation policy, it says so and offers your contact info — it never makes things up." },
];

export default function HomePage() {
  return (
    <main>
      <section className="hero" id="top">
        <Image
          alt="Golfer finishing a drive on a desert golf course at sunset"
          className="hero-photo"
          fill
          priority
          sizes="100vw"
          src="/lessonleads-golfer-hero.png"
        />
        <div className="hero-wash" />
        <header className="site-header page-width">
          <Logo />
          <nav aria-label="Primary navigation">
            <Link href="/how-it-works">How it works</Link>
            <Link href="/features">Features</Link>
            <Link href="/pricing">Pricing</Link>
            <Link href="/resources">Resources</Link>
          </nav>
          <div className="header-actions">
            <Link className="login-link" href="/login">Log in</Link>
            <Link className="button button-primary header-cta" href="/signup">Build your widget</Link>
          </div>
          <MobileMenu />
        </header>

        <div className="hero-grid page-width">
          <div className="hero-copy">
            <p className="eyebrow">For golf coaches and instructors</p>
            <h1>Turn your golf website into a <span>24/7 lesson funnel.</span></h1>
            <p className="hero-lede">
              LessonLeads learns from your website, videos, and coaching content — then answers golfers&apos; questions,
              captures qualified leads, and sends them to the right lesson.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/signup">
                Build your widget <ArrowRight size={17} />
              </Link>
              <Link className="button button-secondary" href="/demo">
                <Play size={16} fill="currentColor" /> See it in action
              </Link>
            </div>
            <ul className="trust-list" aria-label="Product assurances">
              <li><Check size={14} /> Free to start</li>
              <li><Check size={14} /> Keep your booking system</li>
              <li><Check size={14} /> One line of code</li>
            </ul>
          </div>
          <div className="hero-demo" id="live-demo">
            <HomeDemo />
          </div>
        </div>
      </section>

      <section className="proof-band" id="how-it-works">
        <div className="page-width proof-grid">
          <div className="process-copy">
            <p className="eyebrow">How it works</p>
            <h2>Live on your site in minutes.</h2>
            <p>You already have the website, the content, and the booking page. LessonLeads connects them.</p>
          </div>
          <ol className="process-steps five">
            {setupSteps.map((step) => (
              <li key={step.number}><span>{step.number}</span><strong>{step.title}</strong><small>{step.text}</small></li>
            ))}
          </ol>
          <aside className="keep-lead-card">
            <ShieldCheck size={28} />
            <div>
              <strong>Keep the opportunity.</strong>
              <p>Even when a golfer isn&apos;t ready to book, you get their name, email, and exactly what they&apos;re working on.</p>
            </div>
          </aside>
        </div>
      </section>

      <section className="value-section page-width">
        <div className="value-heading">
          <p className="eyebrow">What it does for you</p>
          <h2>More inquiries. More swing submissions. More bookings.</h2>
          <p>
            Golfers land on your site from Google, Instagram, and YouTube with questions. Most leave without a trace.
            LessonLeads gives them a reason to stay — and gives you a lead.
          </p>
        </div>
        <div className="value-grid">
          {valueProps.map(({ icon: Icon, title, text }) => (
            <article className="value-card" key={title}><Icon size={22} /><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <section className="funnel-band">
        <div className="page-width funnel-band-grid">
          <div>
            <p className="eyebrow">The numbers that matter</p>
            <h2>See exactly what your website produces.</h2>
            <p>
              Widget opens, conversations, leads, swing uploads, and booking clicks — in one funnel, so you know what your
              traffic is worth and where golfers drop off.
            </p>
            <Link className="button button-secondary" href="/how-it-works">See the full flow <ArrowRight size={16} /></Link>
          </div>
          <div className="funnel-example" aria-label="Example conversion funnel">
            <div><strong>487</strong><span>Widget opens</span></div>
            <div><strong>218</strong><span>Conversations</span></div>
            <div><strong>61</strong><span>Leads captured</span></div>
            <div><strong>29</strong><span>Booking clicks</span></div>
          </div>
        </div>
      </section>

      <BottomCta />
      <MarketingFooter />

      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        type="application/ld+json"
      />
    </main>
  );
}
