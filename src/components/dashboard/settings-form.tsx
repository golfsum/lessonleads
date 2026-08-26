"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CoachProfile, NotificationPrefs } from "@/lib/domain/types";

export function SettingsForm({ coach }: { coach: CoachProfile }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: coach.name,
    businessName: coach.businessName,
    email: coach.email,
    phone: coach.phone ?? "",
    location: coach.location,
    title: coach.title,
    credentials: coach.credentials.join(", "),
    bio: coach.bio,
    philosophy: coach.philosophy,
    teachingFocus: coach.teachingFocus.join(", "),
    profilePhotoUrl: coach.profilePhotoUrl ?? "",
    instagram: coach.socialLinks.instagram ?? "",
    youtube: coach.socialLinks.youtube ?? "",
    facebook: coach.socialLinks.facebook ?? "",
  });
  const [prefs, setPrefs] = useState<NotificationPrefs>(coach.notificationPrefs);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form, value: string) => setForm((previous) => ({ ...previous, [key]: value }));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    setError(null);
    const response = await fetch("/api/settings/profile", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        businessName: form.businessName,
        email: form.email,
        phone: form.phone,
        location: form.location,
        title: form.title,
        credentials: form.credentials.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 8),
        bio: form.bio,
        philosophy: form.philosophy,
        teachingFocus: form.teachingFocus.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 10),
        profilePhotoUrl: form.profilePhotoUrl,
        socialLinks: { instagram: form.instagram, youtube: form.youtube, facebook: form.facebook },
        notificationPrefs: prefs,
      }),
    });
    setBusy(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Couldn't save your settings.");
      return;
    }
    setMessage("Saved.");
    router.refresh();
  }

  const prefRows: Array<{ key: keyof NotificationPrefs; label: string }> = [
    { key: "newLead", label: "New lead captured" },
    { key: "highIntentLead", label: "High-intent lead detected" },
    { key: "swingUpload", label: "Swing uploaded" },
    { key: "bookingClick", label: "Booking link clicked" },
    { key: "everyConversation", label: "Every conversation (noisy)" },
  ];

  return (
    <form className="settings-form" onSubmit={save}>
      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">Profile</p><h2>How you appear in the widget</h2></div></div>
        <div className="field-grid two">
          <label>Your name<input maxLength={100} onChange={(event) => set("name", event.target.value)} required value={form.name} /></label>
          <label>Business name<input maxLength={120} onChange={(event) => set("businessName", event.target.value)} required value={form.businessName} /></label>
          <label>Title<input maxLength={100} onChange={(event) => set("title", event.target.value)} value={form.title} placeholder="PGA Professional" /></label>
          <label>Credentials (comma separated)<input onChange={(event) => set("credentials", event.target.value)} value={form.credentials} placeholder="PGA Class A, TPI Certified" /></label>
          <label className="span-two">Location<input maxLength={160} onChange={(event) => set("location", event.target.value)} value={form.location} placeholder="Tucson, Arizona" /></label>
          <label className="span-two">Bio<textarea maxLength={1500} onChange={(event) => set("bio", event.target.value)} rows={3} value={form.bio} /></label>
          <label className="span-two">Teaching philosophy<textarea maxLength={1500} onChange={(event) => set("philosophy", event.target.value)} rows={2} value={form.philosophy} /></label>
          <label className="span-two">Teaching focus (comma separated)<input onChange={(event) => set("teachingFocus", event.target.value)} value={form.teachingFocus} placeholder="Private lessons, Online coaching, Junior golf" /></label>
          <label className="span-two">Profile photo URL<input maxLength={500} onChange={(event) => set("profilePhotoUrl", event.target.value)} type="url" value={form.profilePhotoUrl} placeholder="https://yoursite.com/headshot.jpg" /></label>
          <label>Instagram<input maxLength={300} onChange={(event) => set("instagram", event.target.value)} type="url" value={form.instagram} placeholder="https://instagram.com/…" /></label>
          <label>YouTube<input maxLength={300} onChange={(event) => set("youtube", event.target.value)} type="url" value={form.youtube} placeholder="https://youtube.com/@…" /></label>
          <label>Facebook<input maxLength={300} onChange={(event) => set("facebook", event.target.value)} type="url" value={form.facebook} placeholder="https://facebook.com/…" /></label>
        </div>
      </section>

      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">Contact & notifications</p><h2>Where leads reach you</h2></div></div>
        <div className="field-grid two">
          <label>Notification email<input onChange={(event) => set("email", event.target.value)} required type="email" value={form.email} /></label>
          <label>Phone (optional)<input maxLength={40} onChange={(event) => set("phone", event.target.value)} type="tel" value={form.phone} /></label>
        </div>
        <div className="pref-list">
          <p className="eyebrow">Email me when:</p>
          {prefRows.map((row) => (
            <label className="toggle pref-toggle" key={row.key}>
              <input checked={prefs[row.key]} onChange={(event) => setPrefs((previous) => ({ ...previous, [row.key]: event.target.checked }))} type="checkbox" />
              <i /><span /> {row.label}
            </label>
          ))}
        </div>
      </section>

      <div className="builder-save-row">
        <button className="button button-primary" disabled={busy} type="submit">{busy ? "Saving…" : "Save settings"}</button>
        {message ? <p className="save-message">{message}</p> : null}
        {error ? <p className="form-error" role="alert">{error}</p> : null}
      </div>
    </form>
  );
}
