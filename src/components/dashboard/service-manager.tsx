"use client";

import { Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Service } from "@/lib/domain/types";
import { formatDuration, formatPrice } from "@/lib/domain/format";

interface ServiceForm {
  id?: string;
  name: string;
  description: string;
  price: string;
  priceLabel: string;
  durationMinutes: string;
  mode: Service["mode"];
  location: string;
  bookingUrl: string;
  ctaLabel: string;
  featured: boolean;
  bestFor: string;
  active: boolean;
}

const emptyForm: ServiceForm = {
  name: "",
  description: "",
  price: "",
  priceLabel: "",
  durationMinutes: "",
  mode: "in_person",
  location: "",
  bookingUrl: "",
  ctaLabel: "",
  featured: false,
  bestFor: "",
  active: true,
};

function toForm(service: Service): ServiceForm {
  return {
    id: service.id,
    name: service.name,
    description: service.description,
    price: service.priceCents === null ? "" : String(service.priceCents / 100),
    priceLabel: service.priceLabel ?? "",
    durationMinutes: service.durationMinutes === null ? "" : String(service.durationMinutes),
    mode: service.mode,
    location: service.location ?? "",
    bookingUrl: service.bookingUrl ?? "",
    ctaLabel: service.ctaLabel ?? "",
    featured: service.featured,
    bestFor: service.bestFor.join(", "),
    active: service.active,
  };
}

export function ServiceManager({ services }: { services: Service[] }) {
  const router = useRouter();
  const [form, setForm] = useState<ServiceForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof ServiceForm>(key: K, value: ServiceForm[K]) =>
    setForm((previous) => (previous ? { ...previous, [key]: value } : previous));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    setError(null);
    const response = await fetch("/api/services", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: form.id,
        name: form.name,
        description: form.description,
        price: form.price.trim() === "" ? null : Number(form.price),
        priceLabel: form.priceLabel.trim() || undefined,
        durationMinutes: form.durationMinutes.trim() === "" ? null : Number(form.durationMinutes),
        mode: form.mode,
        location: form.location.trim() || undefined,
        bookingUrl: form.bookingUrl.trim() || undefined,
        ctaLabel: form.ctaLabel.trim() || undefined,
        featured: form.featured,
        bestFor: form.bestFor.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 10),
        active: form.active,
      }),
    });
    setBusy(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Couldn't save this service.");
      return;
    }
    setForm(null);
    router.refresh();
  }

  async function remove(serviceId: string) {
    if (!window.confirm("Delete this service? It will disappear from your widget.")) return;
    await fetch(`/api/services/${serviceId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <>
      <div className="manager-toolbar">
        <p>These show up in your widget&apos;s Lessons section and in AI recommendations.</p>
        <button className="button button-primary" onClick={() => setForm(emptyForm)} type="button"><Plus size={16} /> Add service</button>
      </div>
      <div className="offering-grid">
        {services.map((service) => (
          <article className={`offering-card ${service.active ? "" : "inactive"}`} key={service.id}>
            <div className="offering-card-top">
              {service.featured ? <span className="featured-flag"><Star size={12} /> Featured</span> : <span />}
              <div className="offering-card-buttons">
                <button aria-label={`Edit ${service.name}`} onClick={() => setForm(toForm(service))} type="button"><Pencil size={15} /></button>
                <button aria-label={`Delete ${service.name}`} onClick={() => void remove(service.id)} type="button"><Trash2 size={15} /></button>
              </div>
            </div>
            <h2>{service.name}</h2>
            <p>{service.description}</p>
            <div className="offering-meta">
              <strong>{formatPrice(service)}</strong>
              {service.durationMinutes ? <span>{formatDuration(service.durationMinutes)}</span> : null}
              <span className="capitalize">{service.mode.replaceAll("_", " ")}</span>
            </div>
            {service.bookingUrl ? <small className="service-booking-url">{service.bookingUrl}</small> : <small className="service-booking-url missing">No booking URL yet</small>}
            {service.bestFor.length > 0 ? (
              <div className="best-for">
                <small>Best for</small>
                {service.bestFor.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            ) : null}
          </article>
        ))}
      </div>
      {services.length === 0 ? <div className="panel empty-state">Add your first lesson or service so the widget can recommend it.</div> : null}

      {form ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={form.id ? "Edit service" : "Add service"}>
          <form className="form-modal" onSubmit={save}>
            <button aria-label="Close" className="modal-close" onClick={() => setForm(null)} type="button"><X size={16} /></button>
            <h2>{form.id ? "Edit service" : "Add a service"}</h2>
            <div className="field-grid two">
              <label className="span-two">Service name<input maxLength={120} onChange={(event) => set("name", event.target.value)} required value={form.name} placeholder="60-Minute Private Lesson" /></label>
              <label className="span-two">Description<textarea maxLength={600} minLength={10} onChange={(event) => set("description", event.target.value)} required rows={3} value={form.description} placeholder="What the golfer gets and who it's for." /></label>
              <label>Price (USD)<input inputMode="decimal" onChange={(event) => set("price", event.target.value)} value={form.price} placeholder="79" /></label>
              <label>Price label (optional)<input maxLength={60} onChange={(event) => set("priceLabel", event.target.value)} value={form.priceLabel} placeholder="From $79 / month" /></label>
              <label>Duration (minutes)<input inputMode="numeric" onChange={(event) => set("durationMinutes", event.target.value)} value={form.durationMinutes} placeholder="60" /></label>
              <label>Format
                <select onChange={(event) => set("mode", event.target.value as Service["mode"])} value={form.mode}>
                  <option value="in_person">In person</option>
                  <option value="online">Online</option>
                  <option value="both">Both</option>
                </select>
              </label>
              <label className="span-two">Location (optional)<input maxLength={200} onChange={(event) => set("location", event.target.value)} value={form.location} placeholder="Tucson Golf Academy, AZ" /></label>
              <label className="span-two">Booking URL<input maxLength={500} onChange={(event) => set("bookingUrl", event.target.value)} type="url" value={form.bookingUrl} placeholder="https://calendly.com/you/lesson" /></label>
              <label>Button text (optional)<input maxLength={60} onChange={(event) => set("ctaLabel", event.target.value)} value={form.ctaLabel} placeholder="Book Swing Analysis" /></label>
              <label>Best for (comma separated)<input onChange={(event) => set("bestFor", event.target.value)} value={form.bestFor} placeholder="slice, driver, beginners" /></label>
            </div>
            <div className="modal-toggles">
              <label className="toggle"><input checked={form.featured} onChange={(event) => set("featured", event.target.checked)} type="checkbox" /><i /><span /> Featured</label>
              <label className="toggle"><input checked={form.active} onChange={(event) => set("active", event.target.checked)} type="checkbox" /><i /><span /> Active</label>
            </div>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className="button button-primary button-full" disabled={busy} type="submit">{busy ? "Saving…" : "Save service"}</button>
          </form>
        </div>
      ) : null}
    </>
  );
}
