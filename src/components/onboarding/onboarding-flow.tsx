"use client";

import { ArrowLeft, ArrowRight, Check, Globe, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { LogoUrlField } from "@/components/widget/logo-url-field";
import { TEE_TIME_PROVIDER_OPTIONS } from "@/lib/domain/defaults";
import { isCourseLike } from "@/lib/domain/organization";
import type { BookingProvider, CourseAccessType, OrganizationType, TeeTimeProviderId, WidgetSectionKey } from "@/lib/domain/types";

interface ScanSummary {
  pagesIndexed: number;
  pages: Array<{ url: string; title: string; faqCount: number; category?: string }>;
  detected: {
    siteName?: string;
    imageUrl?: string;
    logoUrl?: string;
    themeColor?: string;
    youtubeLinks: string[];
    bookingLinks: string[];
  };
}

const businessTypes: Array<{ value: OrganizationType; label: string; hint: string }> = [
  { value: "golf_coach", label: "Golf Coach", hint: "Independent instructor or teaching pro" },
  { value: "golf_academy", label: "Golf Academy", hint: "A team of coaches or a teaching facility" },
  { value: "golf_course", label: "Golf Course", hint: "Public, private, resort, or semi-private course" },
  { value: "golf_facility", label: "Golf Facility", hint: "Range, simulator, or multi-activity golf venue" },
  { value: "golf_fitting_studio", label: "Golf Fitting Studio", hint: "Club fitting and equipment" },
  { value: "golf_retailer", label: "Other", hint: "Retail or another golf business" },
];

const coachFeatures: Array<{ key: WidgetSectionKey; label: string; hint: string; locked?: boolean }> = [
  { key: "ask", label: "Ask coaching questions", hint: "AI answers grounded in your content. Always on.", locked: true },
  { key: "lessons", label: "Browse lessons", hint: "Your services with booking buttons." },
  { key: "videos", label: "Watch training videos", hint: "Your YouTube and video library." },
  { key: "swing", label: "Upload a swing", hint: "High-intent leads send you swing videos." },
  { key: "faq", label: "Read your FAQ", hint: "Structured answers to common questions." },
  { key: "coach", label: "Learn about you", hint: "Your bio, credentials, and philosophy." },
  { key: "contact", label: "Contact you", hint: "A direct handoff for anything else." },
];

const courseFeatures: Array<{ key: WidgetSectionKey; label: string; hint: string; locked?: boolean }> = [
  { key: "ask", label: "Ask the course", hint: "Answers from your website, rates, and policies. Always on.", locked: true },
  { key: "tee_times", label: "Find tee times", hint: "Live search when connected, or a booking-page handoff." },
  { key: "course", label: "About the course", hint: "Layout, amenities, and what golfers should know." },
  { key: "lessons", label: "Golf instruction", hint: "Lessons and teaching professionals." },
  { key: "events", label: "Outings and events", hint: "Tournaments, groups, and event inquiries." },
  { key: "membership", label: "Membership", hint: "Membership options and inquiries." },
  { key: "faq", label: "FAQ", hint: "Hours, dress code, carts, and policies." },
  { key: "contact", label: "Contact", hint: "A direct handoff for anything else." },
];

const lessonProviders: Array<{ value: BookingProvider; label: string }> = [
  { value: "calendly", label: "Calendly" },
  { value: "coachnow", label: "CoachNow" },
  { value: "golf_genius", label: "Golf Genius" },
  { value: "acuity", label: "Acuity Scheduling" },
  { value: "square", label: "Square Appointments" },
  { value: "mindbody", label: "Mindbody" },
  { value: "custom", label: "Custom booking site" },
  { value: "none", label: "No online booking yet" },
];

function listPhrase(items: string[]) {
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, and ${items[items.length - 1]}`;
}

function isHexColor(value: string | undefined): value is string {
  return Boolean(value && /^#[0-9a-f]{6}$/i.test(value));
}

export function OnboardingFlow({ defaults }: { defaults: { coachName: string; businessName: string; email: string; location: string } }) {
  const router = useRouter();
  const [orgType, setOrgType] = useState<OrganizationType>("golf_coach");
  const course = isCourseLike(orgType);
  const steps = course
    ? ["Business", "Website", "Features", "Course", "Tee times", "Finish"]
    : ["Business", "Website", "Features", "Branding", "Booking", "Finish"];
  const featureOptions = course ? courseFeatures : coachFeatures;
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
    tee_times: true,
    course: true,
    events: true,
    membership: false,
  });

  const [coachName, setCoachName] = useState(defaults.coachName);
  const [businessName, setBusinessName] = useState(defaults.businessName);
  const [email, setEmail] = useState(defaults.email);
  const [location, setLocation] = useState(defaults.location);
  const [assistantName, setAssistantName] = useState("");
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#1b552c");
  const [logoUrl, setLogoUrl] = useState("");
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [courseCount, setCourseCount] = useState(1);
  const [accessType, setAccessType] = useState<CourseAccessType>("public");

  const [bookingProvider, setBookingProvider] = useState<BookingProvider>("calendly");
  const [bookingUrl, setBookingUrl] = useState("");
  const [teeTimeProvider, setTeeTimeProvider] = useState<TeeTimeProviderId>("custom_url");
  const [teeTimeBookingUrl, setTeeTimeBookingUrl] = useState("");

  const providerMeta = useMemo(
    () => TEE_TIME_PROVIDER_OPTIONS.find((option) => option.value === teeTimeProvider),
    [teeTimeProvider],
  );

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
      if (summary.detected.siteName && businessName === defaults.businessName) setBusinessName(summary.detected.siteName.slice(0, 120));
      if (isHexColor(summary.detected.themeColor)) setPrimaryColor(summary.detected.themeColor);
      if (summary.detected.logoUrl) setLogoUrl(summary.detected.logoUrl);
      if (summary.detected.bookingLinks[0]) {
        setBookingUrl(summary.detected.bookingLinks[0]);
        setTeeTimeBookingUrl(summary.detected.bookingLinks[0]);
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
    const name = coachName.trim() || defaults.coachName || (course ? businessName : "Coach");
    const firstName = name.split(" ")[0] || "your coach";
    const display = course ? businessName.trim() || name : firstName;
    const response = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        organizationType: orgType,
        coachName: name,
        businessName: businessName.trim() || defaults.businessName || name,
        email: email.trim() || defaults.email,
        website: website.trim() || undefined,
        location: location.trim(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        bookingProvider: course ? "custom" : bookingProvider,
        bookingUrl: course ? teeTimeBookingUrl : bookingProvider === "none" ? "" : bookingUrl,
        teeTimeProvider: course ? teeTimeProvider : undefined,
        teeTimeBookingUrl: course ? (teeTimeProvider === "none" ? "" : teeTimeBookingUrl) : undefined,
        courseCount: course ? courseCount : undefined,
        accessType: course ? accessType : undefined,
        enabledSections,
        assistantName: assistantName.trim() || `Ask ${display}`,
        welcomeMessage:
          welcomeMessage.trim() ||
          (course
            ? `Welcome to ${display}. I can help with tee times, rates, memberships, events, and lessons.`
            : `Hey, I'm ${firstName}'s coaching assistant. Tell me what you're struggling with and I'll point you in the right direction.`),
        primaryColor,
        logoUrl: logoUrl.trim(),
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

  function brandingGaps() {
    const missing: string[] = [];
    if (!course && !coachName.trim()) missing.push("name");
    if (!businessName.trim()) missing.push(course ? "course name" : "business name");
    if (!email.trim()) missing.push("email");
    if (!location.trim()) missing.push("location");
    return missing;
  }

  function skipBranding() {
    setError("");
    setMissingFields([]);
    setStep(4);
  }

  function markFilled(field: string) {
    setMissingFields((current) => current.filter((item) => item !== field));
  }

  function next() {
    setError("");
    setMissingFields([]);
    if (step === 1 && !scan && !skippedScan && website.trim()) {
      void runScan().then(() => setStep(2));
      return;
    }
    if (step === 3) {
      const missing = brandingGaps();
      if (missing.length > 0) {
        setMissingFields(missing);
        setError(`Add your ${listPhrase(missing)}.`);
        return;
      }
    }
    if (step === 3 && logoUrl.trim() && !/^https?:\/\//i.test(logoUrl.trim())) {
      setError("Logo should be a full URL starting with https://, or leave it blank.");
      return;
    }
    if (step === 4 && !course && bookingProvider !== "none" && !/^https:\/\//.test(bookingUrl.trim())) {
      setError("Enter your booking link (it should start with https://), or choose \u201cNo online booking yet\u201d.");
      return;
    }
    if (step === 4 && course && teeTimeProvider !== "none" && teeTimeBookingUrl.trim() && !/^https:\/\//.test(teeTimeBookingUrl.trim())) {
      setError("Enter the tee-time booking URL (https://), or choose None.");
      return;
    }
    if (step === steps.length - 1) {
      void finish();
      return;
    }
    setStep((current) => current + 1);
  }

  const categories = [...new Set((scan?.pages ?? []).map((page) => page.category).filter(Boolean))];

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
          <h1>What type of golf business are you?</h1>
          <p>The widget stays the same product. This just sets the right defaults for your visitors.</p>
          <div className="feature-choices">
            {businessTypes.map((option) => (
              <label className={`feature-choice ${orgType === option.value ? "checked" : ""}`} key={option.value}>
                <input checked={orgType === option.value} onChange={() => setOrgType(option.value)} type="radio" name="orgType" />
                <span className="feature-check"><Check size={13} /></span>
                <span><strong>{option.label}</strong><small>{option.hint}</small></span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="onboarding-step">
          <p className="eyebrow">Step 2 of {steps.length}</p>
          <h1>{course ? "What's the course website?" : "What's your website?"}</h1>
          <p>LessonLeads reads your public pages so the assistant can answer questions from your own content.</p>
          <div className="scan-row">
            <label className="scan-input">
              <Globe size={16} />
              <input
                aria-label={course ? "Course website" : "Your website"}
                onChange={(event) => setWebsite(event.target.value)}
                placeholder={course ? "https://desertfairways.example" : "https://coachmikegolf.com"}
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
                {categories.length > 0 ? <li><Check size={15} /> Categorized as {categories.join(", ")}</li> : null}
                {scan.pages.some((page) => page.faqCount > 0) ? <li><Check size={15} /> An FAQ ({scan.pages.reduce((total, page) => total + page.faqCount, 0)} questions)</li> : null}
                {scan.detected.siteName ? <li><Check size={15} /> Name: {scan.detected.siteName}</li> : null}
                {scan.detected.logoUrl ? <li><Check size={15} /> Site logo</li> : null}
                {scan.detected.bookingLinks.length > 0 ? <li><Check size={15} /> A booking link</li> : null}
              </ul>
              <small>You can include, exclude, or re-sync any page later under Knowledge.</small>
            </div>
          ) : null}
          <p className="honesty-note"><ShieldCheck size={16} /> We only read public pages and respect robots.txt. Nothing is published without your approval.</p>
          {!scan ? (
            <button className="text-button skip-link" onClick={() => { setSkippedScan(true); setStep(2); }} type="button">
              I don&apos;t have a website yet — skip this step
            </button>
          ) : null}
        </div>
      ) : null}

      {step === 2 ? (
        <div className="onboarding-step">
          <p className="eyebrow">Step 3 of {steps.length}</p>
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

      {step === 3 ? (
        <div className="onboarding-step">
          <p className="eyebrow">Step 4 of {steps.length}</p>
          <h1>{course ? "Tell us about the course." : "Make it yours."}</h1>
          <p>{scan ? "We pre-filled what we detected — fix anything that's off." : course ? "This is how the widget introduces the course." : "This is how the widget introduces your coaching."}</p>
          <div className="field-grid two">
            {course ? (
              <label className={missingFields.includes("course name") ? "field-missing" : undefined}>Course name<input maxLength={120} onChange={(event) => { setBusinessName(event.target.value); markFilled("course name"); }} value={businessName} /></label>
            ) : (
              <>
                <label className={missingFields.includes("name") ? "field-missing" : undefined}>Your name<input maxLength={100} onChange={(event) => { setCoachName(event.target.value); markFilled("name"); }} value={coachName} /></label>
                <label className={missingFields.includes("business name") ? "field-missing" : undefined}>Business or academy<input maxLength={120} onChange={(event) => { setBusinessName(event.target.value); markFilled("business name"); }} value={businessName} /></label>
              </>
            )}
            {course ? <label>Contact name<input maxLength={100} onChange={(event) => setCoachName(event.target.value)} value={coachName} placeholder="Head professional or manager" /></label> : null}
            <label className={missingFields.includes("email") ? "field-missing" : undefined}>Email<input onChange={(event) => { setEmail(event.target.value); markFilled("email"); }} type="email" value={email} /></label>
            <label className={missingFields.includes("location") ? "field-missing" : undefined}>Location<input maxLength={160} onChange={(event) => { setLocation(event.target.value); markFilled("location"); }} value={location} placeholder="Tucson, Arizona" /></label>
            {course ? (
              <>
                <label>Number of courses
                  <select onChange={(event) => setCourseCount(Number(event.target.value))} value={courseCount}>
                    {[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count}</option>)}
                  </select>
                </label>
                <label>Access
                  <select onChange={(event) => setAccessType(event.target.value as CourseAccessType)} value={accessType}>
                    <option value="public">Public</option>
                    <option value="semi_private">Semi-private</option>
                    <option value="private">Private</option>
                    <option value="resort">Resort</option>
                  </select>
                </label>
              </>
            ) : null}
            <label>Assistant name<input maxLength={60} onChange={(event) => setAssistantName(event.target.value)} value={assistantName} placeholder={`Ask ${course ? businessName || "the course" : coachName.split(" ")[0] || "Coach"}`} /></label>
            <label>Brand color<input onChange={(event) => setPrimaryColor(event.target.value)} type="color" value={primaryColor} /></label>
            <LogoUrlField onChange={setLogoUrl} value={logoUrl} />
            <label className="span-two">Welcome message
              <textarea
                maxLength={400}
                onChange={(event) => setWelcomeMessage(event.target.value)}
                placeholder={course ? `Welcome to ${businessName || "the course"}. I can help with tee times, rates, memberships, and lessons.` : `Hey, I'm ${coachName.split(" ")[0] || "your coach"}'s coaching assistant. Tell me what you're struggling with and I'll point you in the right direction.`}
                rows={3}
                value={welcomeMessage}
              />
            </label>
          </div>
          <button className="text-button skip-link" onClick={skipBranding} type="button">
            Skip for now. You can finish this in Settings.
          </button>
        </div>
      ) : null}

      {step === 4 && !course ? (
        <div className="onboarding-step">
          <p className="eyebrow">Step 5 of {steps.length}</p>
          <h1>Where do golfers book with you?</h1>
          <p>The widget sends qualified golfers to your existing booking page — no need to switch tools.</p>
          <div className="field-grid">
            <label>Booking provider
              <select onChange={(event) => setBookingProvider(event.target.value as BookingProvider)} value={bookingProvider}>
                {lessonProviders.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            {bookingProvider !== "none" ? (
              <label>Booking URL<input maxLength={500} onChange={(event) => setBookingUrl(event.target.value)} placeholder="https://calendly.com/coach-mike/lesson" type="url" value={bookingUrl} /></label>
            ) : null}
          </div>
          <p className="honesty-note"><ShieldCheck size={16} /> This is a link handoff. We track booking clicks — we never claim a booking happened unless you mark it.</p>
        </div>
      ) : null}

      {step === 4 && course ? (
        <div className="onboarding-step">
          <p className="eyebrow">Step 5 of {steps.length}</p>
          <h1>How do golfers book tee times?</h1>
          <p>A course can go live with a booking URL today. Live availability is added when a provider is actually connected.</p>
          <div className="field-grid">
            <label>Tee time booking provider
              <select onChange={(event) => setTeeTimeProvider(event.target.value as TeeTimeProviderId)} value={teeTimeProvider}>
                {TEE_TIME_PROVIDER_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            {teeTimeProvider !== "none" ? (
              <label>Booking URL<input maxLength={500} onChange={(event) => setTeeTimeBookingUrl(event.target.value)} placeholder="https://www.golfnow.com/tee-times/facility/..." type="url" value={teeTimeBookingUrl} /></label>
            ) : null}
          </div>
          {providerMeta ? (
            <div className="scan-results">
              <p className="eyebrow">{providerMeta.label}</p>
              <ul>
                <li>Live availability: {providerMeta.liveAvailability}</li>
                <li>Booking: {providerMeta.booking}</li>
              </ul>
            </div>
          ) : null}
          <p className="honesty-note"><ShieldCheck size={16} /> We do not claim every provider has a public API. If live search isn&apos;t connected, golfers still get a clear path to your tee sheet.</p>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="onboarding-step publish-step">
          <span className="publish-icon"><Check size={28} /></span>
          <p className="eyebrow">Ready to go live</p>
          <h1>Your widget is ready to preview and install.</h1>
          <p>
            Next you&apos;ll get one line of code to paste onto your website. You can add services, knowledge, and fine-tune the widget
            from your dashboard whenever you like.
          </p>
          <ul>
            <li><Check size={16} /> Assistant trained on {scan ? `${scan.pagesIndexed} pages` : "the content you add"}</li>
            <li><Check size={16} /> {featureOptions.filter((option) => sections[option.key]).length} visitor features enabled</li>
            <li><Check size={16} /> {course ? `Tee times: ${teeTimeProvider === "none" ? "not connected yet" : TEE_TIME_PROVIDER_OPTIONS.find((option) => option.value === teeTimeProvider)?.label}` : `Booking handoff ${bookingProvider === "none" ? "off for now" : "connected"}`}</li>
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
