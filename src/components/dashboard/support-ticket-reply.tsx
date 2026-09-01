"use client";

import { Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function SupportTicketReply({ ticketId, closed }: { ticketId: string; closed: boolean }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/support/tickets/${ticketId}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ body }),
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    setBusy(false);
    if (!response.ok) {
      setError(payload.error ?? "Couldn't send that reply.");
      return;
    }
    setBody("");
    router.refresh();
  }

  return (
    <form className="ticket-reply" onSubmit={submit}>
      <label htmlFor="ticket-reply">Reply</label>
      <textarea disabled={closed} id="ticket-reply" maxLength={5000} onChange={(event) => setBody(event.target.value)} placeholder={closed ? "This ticket is closed." : "Add an update or answer a question from support."} required rows={5} value={body} />
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <button className="button button-primary" disabled={closed || busy || body.trim().length === 0} type="submit"><Send size={15} /> {busy ? "Sending…" : "Send reply"}</button>
    </form>
  );
}
