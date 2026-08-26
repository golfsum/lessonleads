"use client";

import { useState } from "react";
import type { LeadStatus } from "@/lib/domain/types";

const options: Array<{ value: LeadStatus; label: string }> = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "qualified", label: "Qualified" },
  { value: "booking_sent", label: "Booking sent" },
  { value: "booked", label: "Booked" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
];

export function LeadStatusControl({ leadId, initialStatus }: { leadId: string; initialStatus: LeadStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [saving, setSaving] = useState(false);
  async function update(value: LeadStatus) {
    setStatus(value);
    setSaving(true);
    const response = await fetch(`/api/leads/${leadId}/status`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: value }),
    });
    if (!response.ok) setStatus(initialStatus);
    setSaving(false);
  }
  return (
    <label className="status-control">
      <span>Status</span>
      <select disabled={saving} onChange={(event) => update(event.target.value as LeadStatus)} value={status}>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}
