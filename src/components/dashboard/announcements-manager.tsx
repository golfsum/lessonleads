"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { CourseAnnouncement } from "@/lib/domain/types";

interface AnnouncementForm {
  id?: string;
  title: string;
  message: string;
  startsAt: string;
  expiresAt: string;
  priority: number;
  active: boolean;
}

function toLocalInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AnnouncementsManager({ announcements }: { announcements: CourseAnnouncement[] }) {
  const router = useRouter();
  const [form, setForm] = useState<AnnouncementForm | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    setError(null);
    const response = await fetch("/api/announcements", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: form.id,
        title: form.title,
        message: form.message,
        startsAt: new Date(form.startsAt).toISOString(),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
        priority: form.priority,
        active: form.active,
      }),
    });
    setBusy(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Couldn't save that announcement.");
      return;
    }
    setForm(null);
    router.refresh();
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <div><p className="eyebrow">Course announcements</p><h2>High-priority updates</h2></div>
        <button
          className="button button-secondary"
          onClick={() => setForm({ title: "", message: "", startsAt: toLocalInput(new Date().toISOString()), expiresAt: "", priority: 5, active: true })}
          type="button"
        >
          <Plus size={14} /> Add
        </button>
      </div>
      <p className="panel-copy muted">The assistant uses an active announcement before older website copy for hours, closures, and same-day changes.</p>
      <div className="source-list">
        {announcements.map((item) => (
          <article className={`source-row ${item.active ? "" : "inactive"}`} key={item.id}>
            <div>
              <strong>{item.title}</strong>
              <small>{item.message} · {dateFormat.format(new Date(item.startsAt))}{item.expiresAt ? ` to ${dateFormat.format(new Date(item.expiresAt))}` : ""}</small>
            </div>
            <div className="content-row-actions">
              <button aria-label={`Edit ${item.title}`} onClick={() => setForm({ id: item.id, title: item.title, message: item.message, startsAt: toLocalInput(item.startsAt), expiresAt: toLocalInput(item.expiresAt), priority: item.priority, active: item.active })} type="button"><Pencil size={14} /></button>
              <button aria-label={`Delete ${item.title}`} onClick={() => { if (window.confirm("Remove this announcement?")) void fetch(`/api/announcements/${item.id}`, { method: "DELETE" }).then(() => router.refresh()); }} type="button"><Trash2 size={14} /></button>
            </div>
          </article>
        ))}
        {announcements.length === 0 ? <div className="empty-state">No announcements yet.</div> : null}
      </div>
      {form ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label="Course announcement">
          <form className="form-modal" onSubmit={save}>
            <button aria-label="Close" className="modal-close" onClick={() => setForm(null)} type="button"><X size={16} /></button>
            <h2>{form.id ? "Edit announcement" : "New announcement"}</h2>
            <div className="field-grid">
              <label>Title<input maxLength={120} minLength={2} onChange={(event) => setForm({ ...form, title: event.target.value })} required value={form.title} /></label>
              <label>Priority<input max={100} min={0} onChange={(event) => setForm({ ...form, priority: Number(event.target.value) })} type="number" value={form.priority} /></label>
              <label className="span-two">Message<textarea maxLength={1000} minLength={8} onChange={(event) => setForm({ ...form, message: event.target.value })} required rows={4} value={form.message} /></label>
              <label>Starts<input onChange={(event) => setForm({ ...form, startsAt: event.target.value })} required type="datetime-local" value={form.startsAt} /></label>
              <label>Expires<input onChange={(event) => setForm({ ...form, expiresAt: event.target.value })} type="datetime-local" value={form.expiresAt} /></label>
              <label className="toggle"><input checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} type="checkbox" /><i /><span /> Active</label>
            </div>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className="button button-primary button-full" disabled={busy} type="submit">{busy ? "Saving…" : "Save announcement"}</button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
