import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getWorkspaceData } from "@/lib/data/workspace";

export const dynamic = "force-dynamic";

const dateTimeFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default async function ConversationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getWorkspaceData();
  const conversation = data.conversations.find((candidate) => candidate.id === id);
  if (!conversation) notFound();
  const lead = data.leads.find((candidate) => candidate.id === conversation.leadId);
  const assistantName = data.widget.theme.assistantName;

  return (
    <div className="dashboard-page">
      <Link className="back-link" href="/dashboard/conversations"><ArrowLeft size={14} /> All conversations</Link>
      <div className="dashboard-page-heading">
        <div>
          <h1>{lead ? `${lead.firstName} ${lead.lastName ?? ""}` : "Anonymous visitor"}</h1>
          <p>
            Started {dateTimeFormat.format(new Date(conversation.startedAt))} &middot; {conversation.messages.length} messages &middot;{" "}
            <i className={`intent-pill ${conversation.intentLevel}`}>{conversation.intentLevel} intent</i>
          </p>
        </div>
        {lead ? <Link className="button button-primary" href={`/dashboard/leads/${lead.id}`}>Open lead</Link> : null}
      </div>

      <section className="dashboard-grid two-thirds">
        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Transcript</p><h2>Full conversation</h2></div></div>
          <div className="transcript">
            {conversation.messages.map((message) => (
              <div className={`transcript-message ${message.role}`} key={message.id}>
                <small>{message.role === "assistant" ? assistantName : lead?.firstName ?? "Visitor"} &middot; {dateTimeFormat.format(new Date(message.createdAt))}</small>
                {message.content.split("\n\n").map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                {message.cards && message.cards.length > 0 ? (
                  <div className="transcript-cards">
                    {message.cards.map((card, index) => (
                      <span key={index} className="transcript-card-tag">
                        {card.kind === "video" ? `Video: ${card.title}`
                          : card.kind === "service" ? `Service: ${data.services.find((service) => service.id === card.serviceId)?.name ?? "recommendation"}`
                          : card.kind === "capture" ? "Lead capture offered"
                          : card.kind === "swing_upload" ? "Swing upload offered"
                          : card.kind === "booking" ? "Booking button"
                          : "Contact button"}
                      </span>
                    ))}
                  </div>
                ) : null}
                {message.sources && message.sources.length > 0 ? (
                  <details className="transcript-sources">
                    <summary>Answer sources ({message.sources.length})</summary>
                    <ul>{message.sources.map((source) => <li key={`${message.id}-${source.sourceId}`}>{source.title} <em>({source.type.replaceAll("_", " ")})</em></li>)}</ul>
                  </details>
                ) : null}
              </div>
            ))}
          </div>
        </article>

        <div className="dashboard-grid">
          {conversation.summary ? (
            <article className="panel summary-panel">
              <p className="eyebrow">AI summary</p>
              {conversation.summary.split("\n").filter(Boolean).map((line, index) => <p key={index}>{line}</p>)}
            </article>
          ) : null}
          <article className="panel">
            <div className="panel-heading"><div><p className="eyebrow">Details</p><h2>Session</h2></div></div>
            <dl className="detail-list">
              <div><dt>Device</dt><dd className="capitalize">{conversation.device ?? "Unknown"}</dd></div>
              {conversation.page ? <div><dt>Page</dt><dd>{conversation.page}</dd></div> : null}
              {conversation.referrer ? <div><dt>Referrer</dt><dd>{conversation.referrer}</dd></div> : null}
              {conversation.utm?.source ? <div><dt>UTM source</dt><dd>{conversation.utm.source}</dd></div> : null}
              <div><dt>Lead captured</dt><dd>{lead ? "Yes" : "Not yet"}</dd></div>
              {conversation.recommendedServiceId ? (
                <div><dt>Recommended</dt><dd>{data.services.find((service) => service.id === conversation.recommendedServiceId)?.name ?? "—"}</dd></div>
              ) : null}
            </dl>
          </article>
        </div>
      </section>
    </div>
  );
}
