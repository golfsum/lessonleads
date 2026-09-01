"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import type { Lead, LeadType, SwingUpload } from "@/lib/domain/types";
import { LEAD_TYPE_LABELS } from "@/lib/domain/types";

const dateFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

export function LeadList({ initialLeads }: { initialLeads: Lead[]; swingUploads: SwingUpload[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [intent, setIntent] = useState("all");
  const [type, setType] = useState("all");
  const leads = useMemo(
    () =>
      initialLeads.filter((lead) => {
        const matchesQuery = `${lead.firstName} ${lead.lastName ?? ""} ${lead.email} ${lead.interest ?? ""} ${lead.company ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase());
        return matchesQuery && (status === "all" || lead.status === status) && (intent === "all" || lead.intentLevel === intent) && (type === "all" || lead.leadType === type);
      }),
    [initialLeads, query, status, intent, type],
  );
  return (
    <>
      <div className="lead-filters">
        <label>
          <Search size={16} />
          <input aria-label="Search leads" onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, or interest" value={query} />
        </label>
        <select aria-label="Filter by lead type" onChange={(event) => setType(event.target.value)} value={type}>
          <option value="all">All types</option>
          {(Object.keys(LEAD_TYPE_LABELS) as LeadType[]).map((value) => (
            <option key={value} value={value}>{LEAD_TYPE_LABELS[value]}</option>
          ))}
        </select>
        <select aria-label="Filter by intent" onChange={(event) => setIntent(event.target.value)} value={intent}>
          <option value="all">All intent</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <select aria-label="Filter by status" onChange={(event) => setStatus(event.target.value)} value={status}>
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="booking_sent">Booking sent</option>
          <option value="booked">Booked</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
        </select>
      </div>
      <div className="lead-table" role="table" aria-label="Leads">
        <div className="lead-table-head leads-v2" role="row">
          <span>Golfer</span><span>Type</span><span>Interest</span><span>Intent</span><span>Source</span><span>Status</span><span>Date</span>
        </div>
        {leads.map((lead) => (
          <Link className="lead-table-row leads-v2" href={`/dashboard/leads/${lead.id}`} key={lead.id} role="row">
            <span><b>{lead.firstName} {lead.lastName ?? ""}</b><small>{lead.email}</small></span>
            <span>{LEAD_TYPE_LABELS[lead.leadType] ?? lead.leadType}</span>
            <span className="capitalize">{lead.interest ?? lead.company ?? "—"}</span>
            <span><i className={`intent-pill ${lead.intentLevel}`}>{lead.intentLevel}</i></span>
            <span className="capitalize">{lead.source.replaceAll("_", " ")}</span>
            <span><i className={`status ${lead.status}`}>{lead.status.replaceAll("_", " ")}</i></span>
            <span>{dateFormat.format(new Date(lead.createdAt))}</span>
          </Link>
        ))}
        {!leads.length ? <div className="empty-state">No leads match these filters.</div> : null}
      </div>
    </>
  );
}
