import type { Conversation, WorkspaceData } from "@/lib/domain/types";
import { conversationLimit, leadLimit, upgradePrompt } from "./plans";

/** A visitor can continue one conversation while actively engaged. */
export const CONVERSATION_SESSION_IDLE_MS = 30 * 60_000;

export function isConversationSessionActive(
  conversation: Pick<Conversation, "sessionId" | "lastMessageAt">,
  sessionId: string,
  now = Date.now(),
): boolean {
  if (conversation.sessionId !== sessionId) return false;
  const lastMessageAt = Date.parse(conversation.lastMessageAt);
  return !Number.isFinite(lastMessageAt) || now - lastMessageAt <= CONVERSATION_SESSION_IDLE_MS;
}

export function nextUsageResetAt(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
}

function startOfUtcMonth(date = new Date()): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

export function usageThisMonth(data: WorkspaceData, now = new Date()) {
  const start = startOfUtcMonth(now);
  const conversationKeys = new Set<string>();
  for (const event of data.events) {
    if (event.name !== "conversation_started" || new Date(event.occurredAt).getTime() < start) continue;
    conversationKeys.add(event.conversationId ?? `session:${event.sessionId}`);
  }
  const leads = data.leads.filter((lead) => new Date(lead.createdAt).getTime() >= start).length;
  return { conversations: conversationKeys.size, leads };
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
    conversationsRemaining: Math.max(convLimit - usage.conversations, 0),
    conversationUsagePercent: convLimit > 0 ? Math.min(Math.round((usage.conversations / convLimit) * 100), 100) : 100,
    conversationLimitReached: usage.conversations >= convLimit,
    nearConversationLimit: usage.conversations >= Math.max(1, Math.ceil(convLimit * 0.85)),
    resetAt: nextUsageResetAt(now),
    conversationsExhausted: usage.conversations >= convLimit,
    leadsExhausted: leadsCap !== null && usage.leads >= leadsCap,
    prompt: upgradePrompt({ plan, leadsThisMonth: usage.leads, conversationsThisMonth: usage.conversations }),
  };
}
