"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { supportTicketCategories, type SupportTicketCategory } from "@/lib/support/types";

const categoryLabels: Record<SupportTicketCategory, string> = {
  general: "General question",
  billing: "Billing or plan",
  installation: "Installation",
  widget: "Widget behavior",
  account: "Account access",
  bug: "Something is broken",
  feature_request: "Feature request",
};

export function SupportTicketForm({ disabled = false }: { disabled?: boolean }) {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportTicketCategory>("general");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch("/api/support/tickets", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ subject, category, body }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string; ticket?: { id: string } };
    setBusy(false);
    if (!response.ok || !payload.ticket) {
      setError(payload.error ?? "Couldn't create that ticket.");
      return;
    }
    router.push(`/dashboard/support/${payload.ticket.id}`);
    router.refresh();
  }

  return (
    <form className="support-form" onSubmit={submit}>
      <div className="field-grid">
        <label>What do you need help with?
          <input disabled={disabled} maxLength={160} minLength={4} onChange={(event) => setSubject(event.target.value)} placeholder="My widget is not loading on WordPress" required value={subject} />
        </label>
        <label>Category
          <select disabled={disabled} onChange={(event) => setCategory(event.target.value as SupportTicketCategory)} value={category}>
            {supportTicketCategories.map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}
          </select>
        </label>
        <label>Details
          <textarea disabled={disabled} maxLength={5000} minLength={10} onChange={(event) => setBody(event.target.value)} placeholder="Tell us what you expected, what happened, and the page where you saw it." required rows={7} value={body} />
        </label>
      </div>
      {disabled ? <p className="form-error">Tickets are disabled in the demo workspace.</p> : null}
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="button button-primary" disabled={disabled || busy} type="submit"><Send size={15} /> {busy ? "Sending…" : "Send to support"}</button>
    </form>
  );
}
