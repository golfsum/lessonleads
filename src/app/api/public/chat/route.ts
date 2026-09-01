import { z } from "zod";
import { respond } from "@/lib/ai/engine";
import { buildLeadSummary } from "@/lib/ai/summary";
import {
  appendConversationTurn,
  countConversationsThisMonth,
  getChatContext,
  getConversation,
  recordIntegrationHealth,
  recordWidgetEvent,
  updateConversationSummary,
} from "@/lib/data/workspace";
import { getViewer } from "@/lib/auth/session";
import type { Conversation } from "@/lib/domain/types";
import { conversationLimit, visitorConversationLimitMessage } from "@/lib/billing/plans";
import { isConversationSessionActive } from "@/lib/billing/usage";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { widgetOriginAllowed } from "@/lib/security/origins";
import { requestFingerprint } from "@/lib/security/request";

const schema = z.object({
  coachId: z.string().min(2).max(100),
  conversationId: z.string().max(100).optional(),
  visitorId: z.string().min(8).max(100),
  sessionId: z.string().min(8).max(100),
  message: z.string().trim().min(1).max(2000),
  page: z.string().max(500).optional(),
  referrer: z.string().max(500).optional(),
  utm: z
    .object({ source: z.string().max(120).optional(), medium: z.string().max(120).optional(), campaign: z.string().max(120).optional() })
    .optional(),
  device: z.enum(["mobile", "desktop"]).optional(),
  preview: z.boolean().optional(),
});

/** Restore a returning visitor's conversation (scoped to their visitor id). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const coachId = url.searchParams.get("coachId") ?? "";
  const conversationId = url.searchParams.get("conversationId") ?? "";
  const visitorId = url.searchParams.get("visitorId") ?? "";
  const sessionId = url.searchParams.get("sessionId") ?? "";
  if (!coachId || !conversationId || visitorId.length < 8) return Response.json({ error: "Invalid request." }, { status: 400 });
  const context = await getChatContext(coachId);
  if (!context) return Response.json({ error: "Widget not found." }, { status: 404 });
  const conversation = await getConversation(conversationId);
  if (
    !conversation ||
    conversation.visitorId !== visitorId ||
    conversation.widgetId !== context.publicWidget.widget.id ||
    (sessionId.length >= 8 && !isConversationSessionActive(conversation, sessionId))
  ) {
    return Response.json({ messages: [] });
  }
  return Response.json({
    messages: conversation.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      cards: message.cards,
      suggestedReplies: message.suggestedReplies,
    })),
  });
}

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid message." }, { status: 400 });
  const input = parsed.data;

  const fingerprint = requestFingerprint(request);
  const rate = checkRateLimit(`chat:${fingerprint}`, 20, 60_000);
  if (!rate.allowed) {
    return Response.json({ error: "You're sending messages too quickly. Give it a few seconds." }, { status: 429 });
  }

  const context = await getChatContext(input.coachId);
  if (!context) return Response.json({ error: "Widget not found." }, { status: 404 });

  const allowed = context.publicWidget.widget.allowedOrigins;
  if (
    allowed.length > 0 &&
    !widgetOriginAllowed({
      origin: request.headers.get("origin"),
      page: input.page,
      referrer: request.headers.get("referer") ?? input.referrer,
      allowedOrigins: allowed,
    })
  ) {
    return Response.json({ error: "This widget is not enabled for this website." }, { status: 403 });
  }

  let conversation: Conversation | null = null;
  if (input.conversationId) {
    const candidate = await getConversation(input.conversationId);
    // A persisted conversation can outlive the browser tab. Keep a visitor's
    // active session together, but never attach a fresh session to stale
    // history (or another visitor/widget).
    if (
      candidate &&
      candidate.visitorId === input.visitorId &&
      candidate.widgetId === context.publicWidget.widget.id &&
      isConversationSessionActive(candidate, input.sessionId)
    ) {
      conversation = candidate;
    }
  }
  const isNewConversation = !conversation;
  const preview = Boolean(input.preview) && Boolean(await getViewer());

  if (isNewConversation && !preview) {
    const limit = conversationLimit(context.publicWidget.plan);
    const used = await countConversationsThisMonth(context.data.organization.id);
    if (used >= limit) {
      return Response.json({ error: visitorConversationLimitMessage, usage: { used, limit, remaining: 0 } }, { status: 429 });
    }
  }

  const workingConversation: Conversation =
    conversation ?? {
      id: "",
      organizationId: "",
      widgetId: context.publicWidget.widget.id,
      visitorId: input.visitorId,
      sessionId: input.sessionId,
      messages: [],
      profile: {},
      intentScore: 0,
      intentLevel: "low",
      startedAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
    };

  const result = await respond({
    message: input.message,
    conversation: workingConversation,
    leadCaptured: Boolean(workingConversation.leadId),
    coach: context.publicWidget.coach,
    assistantName: context.publicWidget.widget.theme.assistantName,
    organizationType: context.publicWidget.organizationType,
    organizationId: context.data.organization.id,
    services: context.publicWidget.services,
    contentItems: context.publicWidget.contentItems,
    faqs: context.publicWidget.faqs,
    chunks: context.includedChunks,
    staff: context.publicWidget.staff,
    locations: context.data.locations ?? [],
    announcements: context.publicWidget.announcements,
    suggestedQuestions: context.publicWidget.widget.theme.suggestedQuestions,
    searchTeeTimes: async (search) => {
      const teeRate = checkRateLimit(`tee:${fingerprint}:${context.data.organization.id}`, 8, 60_000);
      if (!teeRate.allowed) {
        return {
          teeTimes: [],
          provider: context.publicWidget.teeTime?.provider ?? "none",
          searchedAt: new Date().toISOString(),
          bookingUrl: context.publicWidget.teeTime?.bookingUrl || context.publicWidget.coach.bookingUrl,
          error: "invalid_request" as const,
          notice: "Too many tee time searches. Try again in a minute.",
        };
      }
      const { resolveTeeTimeProvider, searchTeeTimesForOrganization } = await import("@/lib/tee-times/resolve");
      const integration = context.data.bookingIntegrations?.[0];
      const location =
        (search.locationId ? context.data.locations.find((item) => item.id === search.locationId) : undefined) ??
        context.data.locations[0];
      const provider = resolveTeeTimeProvider({
        integration,
        location,
        bookingUrl: context.publicWidget.teeTime?.bookingUrl || context.publicWidget.coach.bookingUrl,
        demo: context.publicWidget.teeTime?.demoInventory || context.publicWidget.demo,
      });
      const result = await searchTeeTimesForOrganization({
        organizationId: context.data.organization.id,
        provider,
        search: { ...search, organizationId: context.data.organization.id },
      });
      if (integration?.supportsSearch && !context.publicWidget.demo) {
        await recordIntegrationHealth(context.data.organization.id, {
          ok: result.error !== "provider_unavailable",
          error: result.error === "provider_unavailable" ? "Provider request failed" : undefined,
        });
      }
      return result;
    },
  });

  const saved = await appendConversationTurn({
    widgetId: context.publicWidget.widget.id,
    conversationId: conversation?.id,
    visitorId: input.visitorId,
    sessionId: input.sessionId,
    visitorMessage: { role: "visitor", content: input.message },
    assistantMessage: {
      role: "assistant",
      content: result.content,
      cards: result.cards,
      sources: result.sources,
      suggestedReplies: result.suggestedReplies,
    },
    profileUpdates: result.profileUpdates,
    intentScore: result.intentScore,
    recommendedServiceId: result.recommendedServiceId,
    page: input.page,
    referrer: input.referrer,
    utm: input.utm,
    device: input.device,
    preview,
  });

  if (!preview) {
    if (isNewConversation) {
      await recordWidgetEvent({
        widgetId: context.publicWidget.widget.id,
        name: "conversation_started",
        sessionId: input.sessionId,
        conversationId: saved.conversation.id,
        properties: { page: input.page ?? null, referrer: input.referrer ?? null },
      });
    }
    await recordWidgetEvent({
      widgetId: context.publicWidget.widget.id,
      name: "message_sent",
      sessionId: input.sessionId,
      conversationId: saved.conversation.id,
    });
    for (const event of result.analytics ?? []) {
      await recordWidgetEvent({
        widgetId: context.publicWidget.widget.id,
        name: event.name,
        sessionId: input.sessionId,
        conversationId: saved.conversation.id,
        properties: event.properties,
      });
    }
  }

  // Keep the coach-facing summary current once a lead is attached.
  if (saved.conversation.leadId) {
    const lead = context.data.leads.find((candidate) => candidate.id === saved.conversation.leadId);
    const summary = buildLeadSummary({
      firstName: lead?.firstName ?? "This golfer",
      conversation: saved.conversation,
      services: context.publicWidget.services,
      contentItems: context.publicWidget.contentItems,
      swingUploads: context.data.swingUploads,
      coach: context.publicWidget.coach,
    });
    await updateConversationSummary(saved.conversation.id, summary);
  }

  return Response.json({
    conversationId: saved.conversation.id,
    message: {
      id: saved.assistantMessage.id,
      role: "assistant",
      content: result.content,
      cards: result.cards,
      suggestedReplies: result.suggestedReplies,
      createdAt: saved.assistantMessage.createdAt,
    },
    intentLevel: saved.conversation.intentLevel,
  });
}
