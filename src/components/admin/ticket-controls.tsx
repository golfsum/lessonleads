"use client";

import { Send, StickyNote } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ADMIN_TICKET_PRIORITIES,
  ADMIN_TICKET_STATUSES,
  type AdminTicketPriority,
  type AdminTicketStatus,
} from "@/lib/admin/ticket-types";

export function AdminTicketControls({
  ticketId,
  initialStatus,
  initialPriority,
}: {
  ticketId: string;
  initialStatus: AdminTicketStatus;
  initialPriority: AdminTicketPriority;
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [priority, setPriority] = useState(initialPriority);
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [busy, setBusy] = useState<"ticket" | "message" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveTicket(event: React.FormEvent) {
    event.preventDefault();
    setBusy("ticket");
    setError(null);
    const response = await fetch(`/api/admin/tickets/${ticketId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status, priority }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setBusy(null);
    if (!response.ok) {
      setError(payload.error ?? "Couldn't update the ticket.");
      return;
    }
    router.refresh();
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault();
    setBusy("message");
    setError(null);
    const response = await fetch(`/api/admin/tickets/${ticketId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body, internal, status: internal ? undefined : "waiting_on_customer" }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setBusy(null);
    if (!response.ok) {
      setError(payload.error ?? "Couldn't add that message.");
      return;
    }
    setBody("");
    if (!internal) setStatus("waiting_on_customer");
    router.refresh();
  }

  return (
    <div className="admin-ticket-controls">
      <form onSubmit={saveTicket}>
        <div className="field-grid">
          <label>Status<select onChange={(event) => setStatus(event.target.value as AdminTicketStatus)} value={status}>{ADMIN_TICKET_STATUSES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
          <label>Priority<select onChange={(event) => setPriority(event.target.value as AdminTicketPriority)} value={priority}>{ADMIN_TICKET_PRIORITIES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        </div>
        <div className="admin-ticket-controls-actions"><button className="button button-secondary" disabled={busy !== null} type="submit">{busy === "ticket" ? "Saving…" : "Save ticket"}</button></div>
      </form>
      <form onSubmit={sendMessage}>
        <label htmlFor="admin-ticket-message">{internal ? "Private internal note" : "Reply to customer"}</label>
        <textarea id="admin-ticket-message" maxLength={5000} onChange={(event) => setBody(event.target.value)} placeholder={internal ? "Add troubleshooting details only the admin team can see." : "Write a clear update for the customer."} required rows={6} value={body} />
        <div className="admin-ticket-controls-actions">
          <label className="toggle"><input checked={internal} onChange={(event) => setInternal(event.target.checked)} type="checkbox" /><i /><span /> Internal note</label>
          <button className="button button-primary" disabled={busy !== null || body.trim().length === 0} type="submit">{internal ? <StickyNote size={15} /> : <Send size={15} />}{busy === "message" ? "Sending…" : internal ? "Save note" : "Send reply"}</button>
        </div>
      </form>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
    </div>
  );
}
