import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarCheck, Mail, MessagesSquare, Phone, Video } from "lucide-react";
import { LeadNotes } from "@/components/dashboard/lead-notes";
import { LeadStatusControl } from "@/components/dashboard/lead-status";
import { getWorkspaceData } from "@/lib/data/workspace";
import { formatPrice } from "@/lib/domain/format";
import { LEAD_TYPE_LABELS } from "@/lib/domain/types";

export const dynamic = "force-dynamic";

const dateTimeFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getWorkspaceData();
  const lead = data.leads.find((candidate) => candidate.id === id);
  if (!lead) notFound();

  const conversation = data.conversations.find((candidate) => candidate.id === lead.conversationId);
  const uploads = data.swingUploads.filter((upload) => upload.leadId === lead.id);
  const service = data.services.find((candidate) => candidate.id === lead.recommendedServiceId);
  const profile = conversation?.profile ?? {};
  const profileRows = [
    ["Experience", profile.experienceLevel],
    ["Handicap", profile.handicap],
    ["Main issue", profile.primaryIssue],
    ["Focus area", profile.focusArea?.replaceAll("_", " ")],
    ["Goal", profile.goals],
    ["Plays", profile.playFrequency],
    ["Prefers", profile.coachingPreference?.replaceAll("_", " ")],
    ["Urgency", profile.urgency],
  ].filter(([, value]) => Boolean(value)) as Array<[string, string]>;

  return (
    <div className="dashboard-page">
      <Link className="back-link" href="/dashboard/leads"><ArrowLeft size={14} /> All leads</Link>
      <div className="lead-detail-heading">
        <div>
          <span className="avatar large">{lead.firstName[0]}{lead.lastName?.[0] ?? ""}</span>
          <div>
            <h1>{lead.firstName} {lead.lastName ?? ""}</h1>
            <p>
              <i className={`intent-pill ${lead.intentLevel}`}>{lead.intentLevel} intent</i>
              {" "}&middot; {LEAD_TYPE_LABELS[lead.leadType]}
              {" "}&middot; captured {dateTimeFormat.format(new Date(lead.createdAt))} &middot; via {lead.source.replaceAll("_", " ")}
            </p>
          </div>
        </div>
        <LeadStatusControl initialStatus={lead.status} leadId={lead.id} />
      </div>

      {lead.summary ? (
        <section className="panel summary-panel">
          <p className="eyebrow">Lead summary</p>
          {lead.summary.split("\n").filter(Boolean).map((line, index) => <p key={index}>{line}</p>)}
        </section>
      ) : null}

      <section className="lead-detail-grid">
        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Contact</p><h2>Reach {lead.firstName}</h2></div></div>
          <dl className="detail-list">
            <div><dt>Email</dt><dd><a href={`mailto:${lead.email}`}>{lead.email}</a></dd></div>
            {lead.phone ? <div><dt>Phone</dt><dd><a href={`tel:${lead.phone}`}>{lead.phone}</a></dd></div> : null}
            <div><dt>Contact consent</dt><dd>{lead.consent ? "Yes" : "No"}</dd></div>
            <div><dt>SMS consent</dt><dd>{lead.smsConsent ? "Yes" : "No"}</dd></div>
            {lead.bookingClickedAt ? <div><dt>Booking click</dt><dd>{dateTimeFormat.format(new Date(lead.bookingClickedAt))}</dd></div> : null}
          </dl>
          <div className="contact-actions">
            <a className="button button-primary" href={`mailto:${lead.email}`}><Mail size={15} /> Email {lead.firstName}</a>
            {lead.phone ? <a className="button button-secondary" href={`tel:${lead.phone}`}><Phone size={15} /> Call</a> : null}
            {conversation ? (
              <Link className="button button-secondary" href={`/dashboard/conversations/${conversation.id}`}>
                <MessagesSquare size={15} /> View conversation ({conversation.messages.length})
              </Link>
            ) : null}
          </div>
        </article>

        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">From the conversation</p><h2>Golfer profile</h2></div></div>
          <dl className="detail-list">
            {profileRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd className="capitalize">{value}</dd></div>)}
            {profileRows.length === 0 ? <div><dt>Profile</dt><dd>Nothing captured yet.</dd></div> : null}
            {lead.interest ? <div><dt>Interest</dt><dd className="capitalize">{lead.interest}</dd></div> : null}
            {lead.company ? <div><dt>Company</dt><dd>{lead.company}</dd></div> : null}
            {lead.eventDate ? <div><dt>Desired date</dt><dd>{lead.eventDate}</dd></div> : null}
            {lead.estimatedPlayers ? <div><dt>Estimated players</dt><dd>{lead.estimatedPlayers}</dd></div> : null}
            {lead.foodBeverage ? <div><dt>Food and beverage</dt><dd>{lead.foodBeverage}</dd></div> : null}
            {lead.membershipInterest ? <div><dt>Membership interest</dt><dd>{lead.membershipInterest}</dd></div> : null}
            {lead.comments ? <div><dt>Comments</dt><dd>{lead.comments}</dd></div> : null}
          </dl>
        </article>

        {service ? (
          <article className="panel recommendation-card">
            <p className="eyebrow">Recommended service</p>
            <h2>{service.name}</h2>
            <p>{service.description}</p>
            <strong>{formatPrice(service)}</strong>
            {service.durationMinutes ? <small>{service.durationMinutes} minutes</small> : null}
            {service.bookingUrl ? <a href={service.bookingUrl} rel="noreferrer" target="_blank"><CalendarCheck size={13} /> Open booking link</a> : null}
          </article>
        ) : null}

        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Swing uploads</p><h2>{uploads.length > 0 ? `${uploads.length} video${uploads.length > 1 ? "s" : ""}` : "No swings yet"}</h2></div></div>
          {uploads.map((upload) => (
            <div className="swing-row" key={upload.id}>
              <Video size={16} />
              <div>
                <strong>{[upload.club, upload.typicalMiss].filter(Boolean).join(" · ") || upload.fileName}</strong>
                <small>{upload.goal ? `Goal: ${upload.goal}` : dateTimeFormat.format(new Date(upload.createdAt))}</small>
              </div>
              <a className="button button-secondary" href={`/api/uploads/${upload.id}`} rel="noreferrer" target="_blank">Watch</a>
            </div>
          ))}
          {uploads.length === 0 ? <p className="empty-hint">Swing videos this golfer uploads will appear here.</p> : null}
        </article>

        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Attribution</p><h2>Where this lead came from</h2></div></div>
          <dl className="detail-list">
            {lead.landingPage ? <div><dt>Landing page</dt><dd>{lead.landingPage}</dd></div> : null}
            {lead.referrer ? <div><dt>Referrer</dt><dd>{lead.referrer}</dd></div> : null}
            {lead.utm?.source ? <div><dt>UTM source</dt><dd>{lead.utm.source}</dd></div> : null}
            {lead.utm?.medium ? <div><dt>UTM medium</dt><dd>{lead.utm.medium}</dd></div> : null}
            {lead.utm?.campaign ? <div><dt>UTM campaign</dt><dd>{lead.utm.campaign}</dd></div> : null}
            {!lead.landingPage && !lead.referrer && !lead.utm?.source ? <div><dt>Attribution</dt><dd>Direct / unknown</dd></div> : null}
          </dl>
        </article>

        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Timeline</p><h2>Activity</h2></div></div>
          <ul className="activity-list">
            {[...lead.activity].reverse().map((entry) => (
              <li key={entry.id}>
                <span />
                <div><strong>{entry.label}</strong><small>{dateTimeFormat.format(new Date(entry.occurredAt))}</small></div>
              </li>
            ))}
          </ul>
        </article>

        <article className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Internal notes</p><h2>Your notes</h2></div></div>
          <LeadNotes initialNotes={lead.notes ?? ""} leadId={lead.id} />
        </article>
      </section>
    </div>
  );
}
