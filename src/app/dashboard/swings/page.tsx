import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { PlanGate } from "@/components/dashboard/plan-gate";
import { hasPlanFeature } from "@/lib/billing/plans";
import { getWorkspaceData } from "@/lib/data/workspace";

export const dynamic = "force-dynamic";

const dateTimeFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default async function SwingUploadsPage() {
  const data = await getWorkspaceData();
  const uploads = [...data.swingUploads].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return (
    <div className="dashboard-page">
      <div className="dashboard-page-heading">
        <div>
          <h1>Swing Uploads</h1>
          <p>Swing videos golfers send through your widget. Each one is a high-intent coaching lead.</p>
        </div>
      </div>
      {hasPlanFeature(data.subscription.plan, "swingUploads") ? null : (
        <PlanGate
          currentPlan={data.subscription.plan}
          required="pro"
          title="Swing uploads are on Pro"
          body="Golfers send a phone video and their miss. You get a high-intent lead, not an anonymous view."
        />
      )}
      <div className="swing-grid">
        {uploads.map((upload) => {
          const lead = data.leads.find((candidate) => candidate.id === upload.leadId);
          const conversation = data.conversations.find((candidate) => candidate.id === upload.conversationId);
          const service = data.services.find((candidate) => candidate.id === conversation?.recommendedServiceId);
          return (
            <article className="panel swing-card" key={upload.id}>
              <div className="swing-card-top">
                <span className="swing-mark"><Clapperboard size={16} /></span>
                <div>
                  <strong>{lead ? `${lead.firstName} ${lead.lastName ?? ""}` : "Anonymous golfer"}</strong>
                  <small>{dateTimeFormat.format(new Date(upload.createdAt))}</small>
                </div>
                {lead ? <i className={`intent-pill ${lead.intentLevel}`}>{lead.intentLevel}</i> : null}
              </div>
              <dl className="detail-list">
                {upload.club ? <div><dt>Club</dt><dd>{upload.club}</dd></div> : null}
                {upload.typicalMiss ? <div><dt>Typical miss</dt><dd>{upload.typicalMiss}</dd></div> : null}
                {upload.handicap ? <div><dt>Handicap</dt><dd>{upload.handicap}</dd></div> : null}
                {upload.goal ? <div><dt>Goal</dt><dd>{upload.goal}</dd></div> : null}
                {conversation ? <div><dt>Conversation</dt><dd>{conversation.messages.length} messages</dd></div> : null}
                {service ? <div><dt>Recommended</dt><dd>{service.name}</dd></div> : null}
                {lead ? <div><dt>Email</dt><dd><a href={`mailto:${lead.email}`}>{lead.email}</a></dd></div> : null}
              </dl>
              <div className="contact-actions">
                <a className="button button-primary" href={`/api/uploads/${upload.id}`} rel="noreferrer" target="_blank">Watch video</a>
                {lead ? <Link className="button button-secondary" href={`/dashboard/leads/${lead.id}`}>Open lead</Link> : null}
                {conversation ? <Link className="button button-secondary" href={`/dashboard/conversations/${conversation.id}`}>Conversation</Link> : null}
              </div>
            </article>
          );
        })}
      </div>
      {uploads.length === 0 ? (
        <div className="panel empty-state">
          No swing uploads yet. Enable the Upload Swing section in your <Link href="/dashboard/widget">widget settings</Link> to start collecting swings.
        </div>
      ) : null}
    </div>
  );
}
