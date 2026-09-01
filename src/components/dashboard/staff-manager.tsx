"use client";

import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { StaffMember } from "@/lib/domain/types";

interface StaffForm {
  id?: string;
  name: string;
  title: string;
  bio: string;
  specialties: string;
  bookingUrl: string;
  email: string;
  active: boolean;
}

const emptyForm: StaffForm = {
  name: "",
  title: "",
  bio: "",
  specialties: "",
  bookingUrl: "",
  email: "",
  active: true,
};

function toForm(member: StaffMember): StaffForm {
  return {
    id: member.id,
    name: member.name,
    title: member.title,
    bio: member.bio,
    specialties: member.specialties.join(", "),
    bookingUrl: member.bookingUrl ?? "",
    email: member.email ?? "",
    active: member.active,
  };
}

export function StaffManager({ staff }: { staff: StaffMember[] }) {
  const router = useRouter();
  const [form, setForm] = useState<StaffForm | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof StaffForm>(key: K, value: StaffForm[K]) =>
    setForm((previous) => (previous ? { ...previous, [key]: value } : previous));

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form) return;
    setBusy(true);
    setError(null);
    const response = await fetch("/api/staff", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        id: form.id,
        name: form.name,
        title: form.title,
        bio: form.bio,
        specialties: form.specialties.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 12),
        bookingUrl: form.bookingUrl.trim() || undefined,
        email: form.email.trim() || undefined,
        active: form.active,
      }),
    });
    setBusy(false);
    if (!response.ok) {
      const payload = (await response.json().catch(() => ({}))) as { error?: string };
      setError(payload.error ?? "Couldn't save this staff member.");
      return;
    }
    setForm(null);
    router.refresh();
  }

  async function remove(staffId: string) {
    if (!window.confirm("Remove this teaching professional from the widget?")) return;
    await fetch(`/api/staff/${staffId}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <>
      <div className="manager-toolbar">
        <p>These teaching professionals show up in the widget when a golfer asks who they should book with.</p>
        <button className="button button-primary" onClick={() => setForm(emptyForm)} type="button"><Plus size={16} /> Add staff</button>
      </div>
      <div className="offering-grid">
        {staff.map((member) => (
          <article className={`offering-card ${member.active ? "" : "inactive"}`} key={member.id}>
            <div className="offering-card-top">
              <span />
              <div className="offering-card-buttons">
                <button aria-label={`Edit ${member.name}`} onClick={() => setForm(toForm(member))} type="button"><Pencil size={15} /></button>
                <button aria-label={`Delete ${member.name}`} onClick={() => void remove(member.id)} type="button"><Trash2 size={15} /></button>
              </div>
            </div>
            <h2>{member.name}</h2>
            <p>{member.title}</p>
            <small>{member.specialties.join(" · ") || "No specialties listed"}</small>
          </article>
        ))}
        {staff.length === 0 ? <div className="empty-state">No golf staff yet. Add a teaching professional to start recommending lessons.</div> : null}
      </div>
      {form ? (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-label={form.id ? "Edit staff" : "Add staff"}>
          <form className="form-modal" onSubmit={save}>
            <button aria-label="Close" className="modal-close" onClick={() => setForm(null)} type="button"><X size={16} /></button>
            <h2>{form.id ? "Edit staff" : "Add golf staff"}</h2>
            <div className="field-grid">
              <label>Name<input maxLength={120} minLength={2} onChange={(event) => set("name", event.target.value)} required value={form.name} /></label>
              <label>Title<input maxLength={120} minLength={2} onChange={(event) => set("title", event.target.value)} required value={form.title} placeholder="PGA Professional" /></label>
              <label className="span-two">Bio<textarea maxLength={2000} minLength={10} onChange={(event) => set("bio", event.target.value)} required rows={4} value={form.bio} /></label>
              <label>Specialties<input maxLength={200} onChange={(event) => set("specialties", event.target.value)} value={form.specialties} placeholder="beginner, junior, short game" /></label>
              <label>Booking URL<input maxLength={500} onChange={(event) => set("bookingUrl", event.target.value)} type="url" value={form.bookingUrl} /></label>
              <label>Email<input maxLength={180} onChange={(event) => set("email", event.target.value)} type="email" value={form.email} /></label>
              <label className="toggle"><input checked={form.active} onChange={(event) => set("active", event.target.checked)} type="checkbox" /><i /><span /> Active in widget</label>
            </div>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className="button button-primary button-full" disabled={busy} type="submit">{busy ? "Saving…" : "Save staff"}</button>
          </form>
        </div>
      ) : null}
    </>
  );
}
