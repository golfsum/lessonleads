import Link from "next/link";
import { getWorkspaceData } from "@/lib/data/workspace";

export const dynamic = "force-dynamic";

const dateTimeFormat = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

export default async function ConversationsPage() {
  const data = await getWorkspaceData();
  const conversations = [...data.conversations].sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
  );
  return (
    <div className="dashboard-page">
      <div className="dashboard-page-heading">
        <div>
          <h1>Conversations</h1>
          <p>Every chat your widget has with a visitor, with intent and lead status.</p>
        </div>
      </div>
      <div className="lead-table" role="table" aria-label="Widget conversations">
        <div className="lead-table-head conversations" role="row">
          <span>Visitor</span><span>First question</span><span>Messages</span><span>Intent</span><span>Lead</span><span>Last activity</span>
        </div>
        {conversations.map((conversation) => {
          const lead = data.leads.find((candidate) => candidate.id === conversation.leadId);
          const firstVisitorMessage = conversation.messages.find((message) => message.role === "visitor");
          return (
            <Link className="lead-table-row conversations" href={`/dashboard/conversations/${conversation.id}`} key={conversation.id} role="row">
              <span><b>{lead ? `${lead.firstName} ${lead.lastName ?? ""}` : "Anonymous visitor"}</b><small>{conversation.device ?? ""}</small></span>
              <span className="truncate">{firstVisitorMessage?.content ?? "—"}</span>
              <span>{conversation.messages.length}</span>
              <span><i className={`intent-pill ${conversation.intentLevel}`}>{conversation.intentLevel}</i></span>
              <span>{lead ? <i className={`status ${lead.status}`}>{lead.status.replaceAll("_", " ")}</i> : conversation.preview ? "Preview" : "—"}</span>
              <span>{dateTimeFormat.format(new Date(conversation.lastMessageAt))}</span>
            </Link>
          );
        })}
        {conversations.length === 0 ? <div className="empty-state">Conversations appear as soon as visitors start chatting with your widget.</div> : null}
      </div>
    </div>
  );
}
