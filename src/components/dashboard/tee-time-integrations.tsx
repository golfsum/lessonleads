"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TEE_TIME_PROVIDER_OPTIONS } from "@/lib/domain/defaults";
import type { BookingIntegration, Location, TeeTimeProviderId } from "@/lib/domain/types";

const statusCopy: Record<string, string> = {
  not_connected: "Not Connected",
  pending_access: "Pending Access",
  connected: "Connected",
  error: "Error",
  coming_soon: "Coming Soon",
};

export function TeeTimeIntegrationsForm({
  integrations,
  locations,
}: {
  integrations: BookingIntegration[];
  locations: Location[];
}) {
  const router = useRouter();
  const current = integrations[0];
  const location = locations[0];
  const [provider, setProvider] = useState<TeeTimeProviderId>(current?.provider ?? location?.teeTimeProvider ?? "custom_url");
  const [bookingUrl, setBookingUrl] = useState(String(current?.configuration.bookingUrl ?? location?.bookingUrl ?? ""));
  const [facilityId, setFacilityId] = useState(current?.externalFacilityId ?? location?.externalFacilityId ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const selected = TEE_TIME_PROVIDER_OPTIONS.find((option) => option.value === provider);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    const response = await fetch("/api/integrations/booking", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        provider,
        bookingUrl: provider === "none" ? "" : bookingUrl,
        externalFacilityId: provider === "golfnow" ? facilityId : undefined,
        locationId: location?.id,
      }),
    });
    setBusy(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Couldn't save.");
      return;
    }
    setMessage("Saved. Live search only runs when a provider is connected with API access.");
    router.refresh();
  }

  return (
    <form className="field-grid" onSubmit={save}>
      <label>Tee time provider
        <select onChange={(event) => setProvider(event.target.value as TeeTimeProviderId)} value={provider}>
          {TEE_TIME_PROVIDER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
      {selected ? (
        <p className="panel-copy muted">
          Live availability: {selected.liveAvailability}. Booking: {selected.booking}.
        </p>
      ) : null}
      {provider === "golfnow" ? (
        <label>GolfNow facility ID
          <input maxLength={80} onChange={(event) => setFacilityId(event.target.value)} value={facilityId} placeholder="Assigned facility ID" />
        </label>
      ) : null}
      {provider !== "none" ? (
        <label>Booking URL
          <input
            maxLength={500}
            onChange={(event) => setBookingUrl(event.target.value)}
            placeholder="https://www.golfnow.com/tee-times/facility/…"
            required={provider === "custom_url"}
            type="url"
            value={bookingUrl}
          />
        </label>
      ) : null}
      <button className="button button-primary" disabled={busy} type="submit">{busy ? "Saving…" : "Save tee-time setup"}</button>
      {message ? <p className="save-message">{message}</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </form>
  );
}

export function IntegrationHealth({ integration }: { integration?: BookingIntegration }) {
  if (!integration) {
    return <p className="panel-copy muted">No tee-time provider connected. A custom booking URL is enough to launch.</p>;
  }
  const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return (
    <dl className="detail-list">
      <div><dt>Status</dt><dd><i className={`status ${integration.status}`}>{statusCopy[integration.status] ?? integration.status}</i></dd></div>
      <div><dt>Provider</dt><dd className="capitalize">{integration.provider.replaceAll("_", " ")}</dd></div>
      <div><dt>Last successful request</dt><dd>{integration.lastSuccessAt ? dateFormat.format(new Date(integration.lastSuccessAt)) : "None yet"}</dd></div>
      <div><dt>Last error</dt><dd>{integration.lastError ?? "None"}</dd></div>
      <div><dt>Live search</dt><dd>{integration.supportsSearch && integration.status === "connected" ? "Yes" : "No"}</dd></div>
      <div><dt>Booking handoff</dt><dd>{integration.supportsBookingHandoff ? "Yes" : "No"}</dd></div>
    </dl>
  );
}
