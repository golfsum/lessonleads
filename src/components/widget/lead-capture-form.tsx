"use client";

import { useState } from "react";
import type { LeadType } from "@/lib/domain/types";
import type { WidgetController } from "./golf-widget";

function randomKey() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function LeadCaptureForm({
  controller,
  compact = false,
  leadType = "lesson",
  onCaptured,
}: {
  controller: WidgetController;
  compact?: boolean;
  leadType?: LeadType;
  onCaptured?: () => void;
}) {
  const { data, session, context } = controller;
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [estimatedPlayers, setEstimatedPlayers] = useState("");
  const [foodBeverage, setFoodBeverage] = useState("");
  const [membershipInterest, setMembershipInterest] = useState("");
  const [comments, setComments] = useState("");
  const [consent, setConsent] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState(false);
  const [idempotencyKey] = useState(randomKey);
  const tournament = leadType === "tournament" || leadType === "corporate_event" || leadType === "group_outing";
  const membership = leadType === "membership";
  const contactName = data.coach.businessName || data.coach.name.split(" ")[0];

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
          leadType,
          company: company.trim() || undefined,
          eventDate: eventDate.trim() || undefined,
          estimatedPlayers: estimatedPlayers ? Number(estimatedPlayers) : undefined,
          foodBeverage: foodBeverage.trim() || undefined,
          membershipInterest: membershipInterest.trim() || undefined,
          comments: comments.trim() || undefined,
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
        {tournament ? (
          <>
            <input type="text" placeholder="Company" value={company} onFocus={markStarted} onChange={(event) => setCompany(event.target.value)} />
            <input type="text" placeholder="Desired date" value={eventDate} onFocus={markStarted} onChange={(event) => setEventDate(event.target.value)} />
            <input type="number" min={1} placeholder="Estimated players" value={estimatedPlayers} onFocus={markStarted} onChange={(event) => setEstimatedPlayers(event.target.value)} />
            <input type="text" placeholder="Food and beverage needs" value={foodBeverage} onFocus={markStarted} onChange={(event) => setFoodBeverage(event.target.value)} />
          </>
        ) : null}
        {membership ? (
          <input type="text" placeholder="Membership interest" value={membershipInterest} onFocus={markStarted} onChange={(event) => setMembershipInterest(event.target.value)} />
        ) : null}
        {tournament || membership ? (
          <input type="text" placeholder="Comments (optional)" value={comments} onFocus={markStarted} onChange={(event) => setComments(event.target.value)} />
        ) : null}
        <input
          type="tel"
          placeholder="Phone (optional)"
          value={phone}
          autoComplete="tel"
          onFocus={markStarted}
          onChange={(event) => setPhone(event.target.value)}
        />
      </div>
      <input type="text" name="websiteHp" tabIndex={-1} autoComplete="off" className="gw-honeypot" aria-hidden="true" />
      <label className="gw-consent">
        <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />
        <span>
          {contactName} can contact me about this.
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
