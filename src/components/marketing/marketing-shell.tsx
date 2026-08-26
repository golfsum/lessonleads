import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { MobileMenu } from "@/components/marketing/mobile-menu";

export function MarketingHeader() {
  return (
    <header className="marketing-header page-width">
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
  );
}

export function MarketingFooter() {
  return (
    <footer className="marketing-footer">
      <div className="page-width footer-grid">
        <div>
          <Logo />
          <p>Turn your golf website traffic into booked lessons.</p>
        </div>
        <div>
          <strong>Product</strong>
          <Link href="/how-it-works">How it works</Link>
          <Link href="/features">Features</Link>
          <Link href="/pricing">Pricing</Link>
          <Link href="/demo">Live demo</Link>
        </div>
        <div>
          <strong>Resources</strong>
          <Link href="/resources">Coach resources</Link>
          <Link href="/golf-lesson-widget">Golf lesson widget</Link>
          <Link href="/works-with/coachnow">Works with CoachNow links</Link>
        </div>
        <div>
          <strong>Company</strong>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <a href="mailto:support@lessonleads.com">Contact</a>
        </div>
      </div>
      <div className="page-width footer-bottom">
        <span>© {new Date().getFullYear()} LessonLeads</span>
        <span>Built for golf instruction businesses.</span>
      </div>
    </footer>
  );
}

export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing-shell">
      <MarketingHeader />
      <main>{children}</main>
      <MarketingFooter />
    </div>
  );
}

export function PageHero({ eyebrow, title, description, action = true }: { eyebrow: string; title: string; description: string; action?: boolean }) {
  return (
    <section className="page-hero page-width">
      <p className="eyebrow">{eyebrow}</p>
      <h1>{title}</h1>
      <p>{description}</p>
      {action ? (
        <div className="page-hero-actions">
          <Link className="button button-primary" href="/signup">Build your widget <ArrowRight size={17} /></Link>
          <Link className="button button-secondary" href="/demo">See it in action</Link>
        </div>
      ) : null}
    </section>
  );
}

export function BottomCta() {
  return (
    <section className="bottom-cta page-width">
      <div>
        <p className="eyebrow">Start free</p>
        <h2>Your website already gets golfers. Start converting them.</h2>
        <p>Connect your website, customize your widget, and paste one line of code. Keep the booking system you already use.</p>
      </div>
      <Link className="button button-light" href="/signup">Build your widget <ArrowRight size={17} /></Link>
    </section>
  );
}
