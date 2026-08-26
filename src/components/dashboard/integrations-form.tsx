"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BookingProvider } from "@/lib/domain/types";

const providers: Array<{ value: BookingProvider; label: string }> = [
  { value: "coachnow", label: "CoachNow" },
  { value: "golf_genius", label: "Golf Genius" },
  { value: "calendly", label: "Calendly" },
  { value: "acuity", label: "Acuity Scheduling" },
  { value: "square", label: "Square Appointments" },
  { value: "mindbody", label: "Mindbody" },
  { value: "custom", label: "Custom booking site" },
  { value: "none", label: "No online booking yet" },
];

export function IntegrationsForm({ initialProvider, initialUrl }: { initialProvider: BookingProvider; initialUrl: string }) {
  const router = useRouter();
  const [provider, setProvider] = useState<BookingProvider>(initialProvider);
  const [url, setUrl] = useState(initialUrl);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    const response = await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ bookingProvider: provider, bookingUrl: provider === "none" ? "" : url }),
    });
    setBusy(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Couldn't save.");
      return;
    }
    setMessage("Saved. Your widget's booking buttons now use this link.");
    router.refresh();
  }

  return (
    <form className="field-grid" onSubmit={save}>
      <label>Booking provider
        <select onChange={(event) => setProvider(event.target.value as BookingProvider)} value={provider}>
          {providers.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </label>
      {provider !== "none" ? (
        <label>Booking URL
          <input
            maxLength={500}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://calendly.com/coach-mike/lesson"
            required
            type="url"
            value={url}
          />
        </label>
      ) : null}
      <button className="button button-primary" disabled={busy} type="submit">{busy ? "Saving…" : "Save booking setup"}</button>
      {message ? <p className="save-message">{message}</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </form>
  );
}
