import type { Conversation, WorkspaceData } from "@/lib/domain/types";
import { conversationLimit, leadLimit, upgradePrompt } from "./plans";

/**
 * A conversation stays active while a visitor is engaged. Returning after this
 * idle window starts a new conversation, even if the browser still has the
 * previous conversation id in local storage.
 */
export const CONVERSATION_SESSION_IDLE_MS = 30 * 60_000;

export function isConversationSessionActive(
  conversation: Pick<Conversation, "sessionId" | "lastMessageAt">,
  sessionId: string,
  now = Date.now(),
): boolean {
  if (conversation.sessionId !== sessionId) return false;
  const lastMessageAt = Date.parse(conversation.lastMessageAt);
  // Keep legacy records with an invalid timestamp usable rather than silently
  // dropping their conversation history.
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
  // Count conversation sessions, not individual messages. The conversation
  // id is preferred; the session id keeps older events deduplicated too.
  const conversationKeys = new Set<string>();
  for (const event of data.events) {
    if (event.name !== "conversation_started" || new Date(event.occurredAt).getTime() < start) continue;
    conversationKeys.add(event.conversationId ?? `session:${event.sessionId}`);
  }
  const conversations = conversationKeys.size;
  const leads = data.leads.filter((lead) => new Date(lead.createdAt).getTime() >= start).length;
  return { conversations, leads };
}

export function usageState(data: WorkspaceData, now = new Date()) {
  const usage = usageThisMonth(data, now);
  const plan = data.subscription.plan;
  const convLimit = conversationLimit(plan);
  const leadsCap = leadLimit(plan);
  const conversationsRemaining = Math.max(convLimit - usage.conversations, 0);
  return {
    ...usage,
    conversationLimit: convLimit,
    leadLimit: leadsCap,
    conversationsRemaining,
    conversationUsagePercent: convLimit > 0 ? Math.min(Math.round((usage.conversations / convLimit) * 100), 100) : 100,
    conversationLimitReached: usage.conversations >= convLimit,
    nearConversationLimit: usage.conversations >= Math.max(1, Math.ceil(convLimit * 0.85)),
    resetAt: nextUsageResetAt(now),
    conversationsExhausted: usage.conversations >= convLimit,
    leadsExhausted: leadsCap !== null && usage.leads >= leadsCap,
    prompt: upgradePrompt({ plan, leadsThisMonth: usage.leads, conversationsThisMonth: usage.conversations }),
  };
}
