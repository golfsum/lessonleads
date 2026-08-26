"use client";

import { useState } from "react";
import type { WidgetController } from "./golf-widget";

function randomKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function LeadCaptureForm({
  controller,
  compact = false,
  onCaptured,
}: {
  controller: WidgetController;
  compact?: boolean;
  onCaptured?: () => void;
}) {
  const { data, session, context } = controller;
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [idempotencyKey] = useState(randomKey);

  const markStarted = () => {
    if (!started) {
      setStarted(true);
      controller.trackEvent("lead_capture_started");
    }
  };

  const source = typeof window !== "undefined" && window.parent !== window ? "floating" : "hosted";

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!firstName.trim() || !email.trim()) {
      setError("Add your first name and email.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/public/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          coachId: data.widget.publicId,
          conversationId: (controller.session.conversationId ?? undefined) || undefined,
          visitorId: session.visitorId,
          sessionId: session.sessionId,
          idempotencyKey,
          firstName: firstName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          consent,
          smsConsent: phone.trim() ? smsConsent : false,
          source,
          landingPage: context.page,
          referrer: context.referrer,
          utm: context.utm,
          preview: controller.preview || undefined,
        }),
      });
      const payload = (await response.json()) as { leadId?: string; error?: string };
      if (!response.ok || !payload.leadId) {
        setError(payload.error ?? "Something went wrong. Try again.");
        return;
      }
      controller.onLeadCaptured(payload.leadId);
      onCaptured?.();
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={`gw-capture-form ${compact ? "compact" : ""}`} onSubmit={submit}>
      <div className="gw-capture-fields">
        <input
          type="text"
          placeholder="First name"
          value={firstName}
          autoComplete="given-name"
          onFocus={markStarted}
          onChange={(event) => setFirstName(event.target.value)}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          autoComplete="email"
          onFocus={markStarted}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
        <input
          type="tel"
          placeholder="Phone (optional)"
          value={phone}
          autoComplete="tel"
          onFocus={markStarted}
          onChange={(event) => setPhone(event.target.value)}
        />
      </div>
      <input type="text" name="company" tabIndex={-1} autoComplete="off" className="gw-honeypot" aria-hidden="true" />
      <label className="gw-consent">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <span>
          {data.coach.name.split(" ")[0]} can contact me about my golf game.
        </span>
      </label>
      {phone.trim() ? (
        <label className="gw-consent">
          <input type="checkbox" checked={smsConsent} onChange={(event) => setSmsConsent(event.target.checked)} />
          <span>OK to text me at this number. (Optional)</span>
        </label>
      ) : null}
      {error ? <p className="gw-error">{error}</p> : null}
      <button type="submit" className="gw-button" disabled={busy || !consent}>
        {busy ? "Saving\u2026" : "Send my details"}
      </button>
    </form>
  );
}
