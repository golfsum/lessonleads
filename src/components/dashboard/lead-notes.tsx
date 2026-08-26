"use client";

import { useState } from "react";

export function LeadNotes({ leadId, initialNotes }: { leadId: string; initialNotes: string }) {
  const [notes, setNotes] = useState(initialNotes);
  const [saved, setSaved] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setSaved(null);
    const response = await fetch(`/api/leads/${leadId}/notes`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ notes }),
    });
    setBusy(false);
    setSaved(response.ok ? "Saved." : "Couldn't save. Try again.");
    if (response.ok) window.setTimeout(() => setSaved(null), 2200);
  }

  return (
    <div className="lead-notes">
      <textarea
        aria-label="Internal notes"
        value={notes}
        rows={4}
        maxLength={5000}
        placeholder="Private notes about this golfer (only you see these)."
        onChange={(event) => setNotes(event.target.value)}
      />
      <div className="lead-notes-actions">
        <button type="button" className="button button-secondary" disabled={busy} onClick={() => void save()}>
          {busy ? "Saving…" : "Save notes"}
        </button>
        {saved ? <p className="save-message">{saved}</p> : null}
      </div>
    </div>
  );
}
