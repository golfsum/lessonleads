"use client";

import { ArrowLeft, ArrowRight, Check, Globe, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BookingProvider, WidgetSectionKey } from "@/lib/domain/types";

const steps = ["Website", "Features", "Branding", "Booking", "Finish"];

interface ScanSummary {
  pagesIndexed: number;
  pages: Array<{ url: string; title: string; faqCount: number }>;
  detected: {
    siteName?: string;
    imageUrl?: string;
    themeColor?: string;
    youtubeLinks: string[];
    bookingLinks: string[];
  };
}

const featureOptions: Array<{ key: WidgetSectionKey; label: string; hint: string; locked?: boolean }> = [
  { key: "ask", label: "Ask coaching questions", hint: "AI answers grounded in your content. Always on.", locked: true },
  { key: "lessons", label: "Browse lessons", hint: "Your services with booking buttons." },
  { key: "videos", label: "Watch training videos", hint: "Your YouTube and video library." },
  { key: "swing", label: "Upload a swing", hint: "High-intent leads send you swing videos." },
  { key: "faq", label: "Read your FAQ", hint: "Structured answers to common questions." },
  { key: "coach", label: "Learn about you", hint: "Your bio, credentials, and philosophy." },
  { key: "contact", label: "Contact you", hint: "A direct handoff for anything else." },
];

const providers: Array<{ value: BookingProvider; label: string }> = [
  { value: "calendly", label: "Calendly" },
  { value: "coachnow", label: "CoachNow" },
  { value: "golf_genius", label: "Golf Genius" },
  { value: "acuity", label: "Acuity Scheduling" },
  { value: "square", label: "Square Appointments" },
  { value: "mindbody", label: "Mindbody" },
  { value: "custom", label: "Custom booking site" },
  { value: "none", label: "No online booking yet" },
];

function isHexColor(value: string | undefined): value is string {
  return Boolean(value && /^#[0-9a-f]{6}$/i.test(value));
}

export function OnboardingFlow({ defaults }: { defaults: { coachName: string; businessName: string; email: string; location: string } }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const [website, setWebsite] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scan, setScan] = useState<ScanSummary | null>(null);
  const [scanError, setScanError] = useState("");
  const [skippedScan, setSkippedScan] = useState(false);

  const [sections, setSections] = useState<Record<string, boolean>>({
    ask: true,
    lessons: true,
    videos: true,
    swing: true,
    faq: false,
    coach: true,
    contact: false,
  });

  const [coachName, setCoachName] = useState(defaults.coachName);
  const [businessName, setBusinessName] = useState(defaults.businessName);
  const [email, setEmail] = useState(defaults.email);
  const [location, setLocation] = useState(defaults.location);
  const [assistantName, setAssistantName] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1b552c");

  const [bookingProvider, setBookingProvider] = useState<BookingProvider>("calendly");
  const [bookingUrl, setBookingUrl] = useState("");

  async function runScan() {
    if (!website.trim()) {
      setScanError("Enter your website address first.");
      return;
    }
    setScanning(true);
    setScanError("");
    try {
      const response = await fetch("/api/knowledge/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ website }),
      });
      const payload = (await response.json().catch(() => ({}))) as Partial<ScanSummary> & { error?: string };
      if (!response.ok || !payload.pages) {
        setScanError(payload.error ?? "We couldn't scan that site. You can skip this and add content later.");
        return;
      }
      const summary = payload as ScanSummary;
      setScan(summary);
      // Pre-fill branding from what the site told us; the coach confirms in step 3.
      if (summary.detected.siteName && businessName === defaults.businessName) setBusinessName(summary.detected.siteName.slice(0, 120));
      if (isHexColor(summary.detected.themeColor)) setPrimaryColor(summary.detected.themeColor);
      if (summary.detected.bookingLinks[0]) {
        setBookingUrl(summary.detected.bookingLinks[0]);
        setBookingProvider(detectProvider(summary.detected.bookingLinks[0]));
      }
    } catch {
      setScanError("Scan failed. Check the URL, or skip this step.");
    } finally {
      setScanning(false);
    }
  }

  async function finish() {
    setPending(true);
    setError("");
    const enabledSections = featureOptions.map((option) => option.key).filter((key) => sections[key]);
    const firstName = coachName.split(" ")[0] || "your coach";
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        coachName,
        businessName,
        email,
        website: website.trim() || undefined,
        location,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        bookingProvider,
        bookingUrl: bookingProvider === "none" ? "" : bookingUrl,
        enabledSections,
        assistantName: assistantName.trim() || `Ask ${firstName}`,
        welcomeMessage:
          welcomeMessage.trim() ||
          `Hey, I'm ${firstName}'s coaching assistant. Tell me what you're struggling with and I'll point you in the right direction.`,
        primaryColor,
      }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      setPending(false);
      setError(payload.error ?? "We couldn't save your setup.");
      return;
    }
    router.push("/dashboard/install");
    router.refresh();
  }

  function next() {
    setError("");
    if (step === 0 && !scan && !skippedScan && website.trim()) {
      // They typed a URL but never scanned — scan on continue so the widget has knowledge.
      void runScan().then(() => setStep(1));
      return;
    }
    if (step === 2 && (!coachName.trim() || !businessName.trim() || !email.trim() || !location.trim())) {
      setError("Fill in your name, business, email, and location.");
      return;
    }
    if (step === 3 && bookingProvider !== "none" && !/^https:\/\//.test(bookingUrl.trim())) {
      setError("Enter your booking link (it should start with https://), or choose \u201cNo online booking yet\u201d.");
      return;
    }
    if (step === steps.length - 1) {
      void finish();
      return;
    }
    setStep((current) => current + 1);
  }

  return (
    <div className="onboarding-card">
      <div className="onboarding-progress" style={{ gridTemplateColumns: `repeat(${steps.length}, 1fr)` }}>
        {steps.map((label, index) => (
          <div className={index <= step ? "active" : ""} key={label}>
            <span>{index < step ? <Check size={14} /> : index + 1}</span><small>{label}</small>
          </div>
        ))}
      </div>

      {step === 0 ? (
        <div className="onboarding-step">
          <p className="eyebrow">Step 1 of {steps.length}</p>
          <h1>What&apos;s your website?</h1>
          <p>LessonLeads reads your public pages so the assistant can answer questions the way you would.</p>
          <div className="scan-row">
            <label className="scan-input">
              <Globe size={16} />
              <input
                aria-label="Your website"
                onChange={(event) => setWebsite(event.target.value)}
                placeholder="https://coachmikegolf.com"
                type="url"
                value={website}
              />
            </label>
            <button className="button button-primary" disabled={scanning} onClick={() => void runScan()} type="button">
              {scanning ? "Scanning…" : "Scan my site"}
            </button>
          </div>
          {scanning ? <p className="scan-progress">Reading your pages — this usually takes under a minute.</p> : null}
          {scanError ? <p className="form-error" role="alert">{scanError}</p> : null}
          {scan ? (
            <div className="scan-results">
              <p className="eyebrow">We found:</p>
              <ul>
                <li><Check size={15} /> {scan.pagesIndexed} readable page{scan.pagesIndexed === 1 ? "" : "s"}</li>
                {scan.pages.some((page) => page.faqCount > 0) ? <li><Check size={15} /> An FAQ ({scan.pages.reduce((total, page) => total + page.faqCount, 0)} questions)</li> : null}
                {scan.detected.siteName ? <li><Check size={15} /> Your business name: {scan.detected.siteName}</li> : null}
                {scan.detected.youtubeLinks.length > 0 ? <li><Check size={15} /> A YouTube channel link</li> : null}
                {scan.detected.bookingLinks.length > 0 ? <li><Check size={15} /> A booking link</li> : null}
              </ul>
              <small>You can include, exclude, or re-sync any page later under Knowledge.</small>
            </div>
          ) : null}
          <p className="honesty-note"><ShieldCheck size={16} /> We only read public pages and respect robots.txt. Nothing is published without your approval.</p>
          {!scan ? (
            <button className="text-button skip-link" onClick={() => { setSkippedScan(true); setStep(1); }} type="button">
              I don&apos;t have a website yet — skip this step
            </button>
          ) : null}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="onboarding-step">
          <p className="eyebrow">Step 2 of {steps.length}</p>
          <h1>What should visitors be able to do?</h1>
          <p>You can rename, reorder, and change these anytime.</p>
          <div className="feature-choices">
            {featureOptions.map((option) => (
              <label className={`feature-choice ${sections[option.key] ? "checked" : ""} ${option.locked ? "locked" : ""}`} key={option.key}>
                <input
                  checked={Boolean(sections[option.key])}
                  disabled={option.locked}
                  onChange={(event) => setSections((previous) => ({ ...previous, [option.key]: event.target.checked }))}
                  type="checkbox"
                />
                <span className="feature-check"><Check size={13} /></span>
                <span><strong>{option.label}</strong><small>{option.hint}</small></span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="onboarding-step">
          <p className="eyebrow">Step 3 of {steps.length}</p>
          <h1>Make it yours.</h1>
          <p>{scan ? "We pre-filled what we detected — fix anything that's off." : "This is how the widget introduces your coaching."}</p>
          <div className="field-grid two">
            <label>Your name<input maxLength={100} onChange={(event) => setCoachName(event.target.value)} required value={coachName} /></label>
            <label>Business or academy<input maxLength={120} onChange={(event) => setBusinessName(event.target.value)} required value={businessName} /></label>
            <label>Email<input onChange={(event) => setEmail(event.target.value)} required type="email" value={email} /></label>
            <label>Location<input maxLength={160} onChange={(event) => setLocation(event.target.value)} required value={location} placeholder="Tucson, Arizona" /></label>
            <label>Assistant name<input maxLength={60} onChange={(event) => setAssistantName(event.target.value)} value={assistantName} placeholder={`Ask ${coachName.split(" ")[0] || "Coach"}`} /></label>
            <label>Brand color<input onChange={(event) => setPrimaryColor(event.target.value)} type="color" value={primaryColor} /></label>
            <label className="span-two">Welcome message
              <textarea
                maxLength={400}
                onChange={(event) => setWelcomeMessage(event.target.value)}
                placeholder={`Hey, I'm ${coachName.split(" ")[0] || "your coach"}'s coaching assistant. Tell me what you're struggling with and I'll point you in the right direction.`}
                rows={3}
                value={welcomeMessage}
              />
            </label>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="onboarding-step">
          <p className="eyebrow">Step 4 of {steps.length}</p>
          <h1>Where do golfers book with you?</h1>
          <p>The widget sends qualified golfers to your existing booking page — no need to switch tools.</p>
          <div className="field-grid">
            <label>Booking provider
              <select onChange={(event) => setBookingProvider(event.target.value as BookingProvider)} value={bookingProvider}>
                {providers.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            {bookingProvider !== "none" ? (
              <label>Booking URL<input maxLength={500} onChange={(event) => setBookingUrl(event.target.value)} placeholder="https://calendly.com/coach-mike/lesson" type="url" value={bookingUrl} /></label>
            ) : null}
          </div>
          <p className="honesty-note"><ShieldCheck size={16} /> This is a link handoff. We track booking clicks — we never claim a booking happened unless you mark it.</p>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="onboarding-step publish-step">
          <span className="publish-icon"><Check size={28} /></span>
          <p className="eyebrow">Ready to go live</p>
          <h1>Your widget is ready to preview and install.</h1>
          <p>
            Next you&apos;ll get one line of code to paste onto your website. You can add services, import YouTube videos, and fine-tune the widget
            from your dashboard whenever you like.
          </p>
          <ul>
            <li><Check size={16} /> Assistant trained on {scan ? `${scan.pagesIndexed} pages` : "the content you add"}</li>
            <li><Check size={16} /> {featureOptions.filter((option) => sections[option.key]).length} visitor features enabled</li>
            <li><Check size={16} /> Booking handoff {bookingProvider === "none" ? "off for now" : "connected"}</li>
          </ul>
        </div>
      ) : null}

      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="onboarding-actions">
        <button className="text-button" disabled={step === 0 || pending} onClick={() => setStep((current) => current - 1)} type="button">
          <ArrowLeft size={16} /> Back
        </button>
        <button className="button button-primary" disabled={pending || scanning} onClick={next} type="button">
          {pending ? "Setting up…" : step === steps.length - 1 ? "Create my widget" : "Continue"} <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}

function detectProvider(url: string): BookingProvider {
  const host = url.toLowerCase();
  if (host.includes("calendly")) return "calendly";
  if (host.includes("coachnow")) return "coachnow";
  if (host.includes("golfgenius")) return "golf_genius";
  if (host.includes("acuity") || host.includes("squarespacescheduling")) return "acuity";
  if (host.includes("square.site") || host.includes("squareup")) return "square";
  if (host.includes("mindbody")) return "mindbody";
  return "custom";
}
