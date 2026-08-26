import type { WorkspaceData } from "@/lib/domain/types";
import { conversationLimit, leadLimit, upgradePrompt } from "./plans";

function startOfUtcMonth(date = new Date()): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

export function usageThisMonth(data: WorkspaceData, now = new Date()) {
  const start = startOfUtcMonth(now);
  const conversations = data.events.filter(
    (event) => event.name === "conversation_started" && new Date(event.occurredAt).getTime() >= start,
  ).length;
  const leads = data.leads.filter((lead) => new Date(lead.createdAt).getTime() >= start).length;
  return { conversations, leads };
}

export function usageState(data: WorkspaceData, now = new Date()) {
  const usage = usageThisMonth(data, now);
  const plan = data.subscription.plan;
  const convLimit = conversationLimit(plan);
  const leadsCap = leadLimit(plan);
  return {
    ...usage,
    conversationLimit: convLimit,
    leadLimit: leadsCap,
    conversationsExhausted: usage.conversations >= convLimit,
    leadsExhausted: leadsCap !== null && usage.leads >= leadsCap,
    prompt: upgradePrompt({ plan, leadsThisMonth: usage.leads, conversationsThisMonth: usage.conversations }),
  };
}
