import { z } from "zod";
import { buildLeadSummary } from "@/lib/ai/summary";
import {
  capturePublicLead,
  countLeadsThisMonth,
  countRecentLeadsByFingerprint,
  getChatContext,
  getConversation,
  updateConversationSummary,
} from "@/lib/data/workspace";
import { getViewer } from "@/lib/auth/session";
import { leadLimit, visitorLeadLimitMessage } from "@/lib/billing/plans";
import { sendNewLeadNotification } from "@/lib/email/send";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { widgetOriginAllowed } from "@/lib/security/origins";
import { requestFingerprint } from "@/lib/security/request";

const schema = z.object({
  coachId: z.string().min(2).max(100),
  conversationId: z.string().max(100).optional(),
  visitorId: z.string().min(8).max(100),
  sessionId: z.string().min(8).max(100),
  idempotencyKey: z.string().min(8).max(220),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().max(80).optional(),
  email: z.email().max(180),
  phone: z.string().trim().max(40).optional(),
  consent: z.boolean(),
  smsConsent: z.boolean().optional().default(false),
  /** Honeypot: must stay empty. */
  websiteHp: z.string().max(0).optional(),
  source: z.enum(["hosted", "inline", "floating", "homepage_demo"]),
  leadType: z
    .enum([
      "lesson",
      "membership",
      "tournament",
      "corporate_event",
      "wedding",
      "group_outing",
      "junior_program",
      "fitting",
      "simulator",
      "restaurant_event",
      "general",
    ])
    .optional(),
  company: z.string().trim().max(160).optional(),
  eventDate: z.string().trim().max(40).optional(),
  estimatedPlayers: z.number().int().min(1).max(500).optional(),
  foodBeverage: z.string().trim().max(200).optional(),
  membershipInterest: z.string().trim().max(160).optional(),
  comments: z.string().trim().max(1000).optional(),
  landingPage: z.string().max(500).optional(),
  referrer: z.string().max(500).optional(),
  utm: z
    .object({ source: z.string().max(120).optional(), medium: z.string().max(120).optional(), campaign: z.string().max(120).optional() })
    .optional(),
  preview: z.boolean().optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check your name and email." }, { status: 400 });
  const input = parsed.data;

  const fingerprint = requestFingerprint(request);
  const rate = checkRateLimit(`lead:${fingerprint}`, 5, 60_000);
  if (!rate.allowed) return Response.json({ error: "Too many attempts. Try again in a minute." }, { status: 429 });
  const recent = await countRecentLeadsByFingerprint(fingerprint);
  if (recent >= 3) return Response.json({ error: "Too many submissions. Try again later." }, { status: 429 });

  try {
    const context = await getChatContext(input.coachId);
    if (!context) return Response.json({ error: "Widget not found." }, { status: 404 });
    if (Boolean(input.preview) && Boolean(await getViewer())) {
      return Response.json({ leadId: "preview", duplicate: false }, { status: 201 });
    }
    const cap = leadLimit(context.publicWidget.plan);
    if (cap !== null) {
      const used = await countLeadsThisMonth(context.data.organization.id);
      if (used >= cap) return Response.json({ error: visitorLeadLimitMessage }, { status: 429 });
    }
    if (
      context.publicWidget.widget.allowedOrigins.length > 0 &&
      !widgetOriginAllowed({
        origin: request.headers.get("origin"),
        page: input.landingPage,
        referrer: request.headers.get("referer") ?? input.referrer,
        allowedOrigins: context.publicWidget.widget.allowedOrigins,
      })
    ) {
      return Response.json({ error: "This widget is not enabled for this website." }, { status: 403 });
    }

    // Build an interest line + AI summary from the conversation when present.
    let summary: string | undefined;
    let interest: string | undefined;
    const conversation = input.conversationId ? await getConversation(input.conversationId) : null;
    if (conversation) {
      summary = buildLeadSummary({
        firstName: input.firstName,
        conversation,
        services: context.publicWidget.services,
        contentItems: context.publicWidget.contentItems,
        swingUploads: context.data.swingUploads,
        coach: context.publicWidget.coach,
      });
      const focus = conversation.profile.focusArea?.replaceAll("_", " ");
      const service = context.publicWidget.services.find((candidate) => candidate.id === conversation.recommendedServiceId);
      interest = [focus, service?.name].filter(Boolean).join(" / ") || undefined;
    }

    const result = await capturePublicLead({
      widgetPublicId: input.coachId,
      conversationId: input.conversationId,
      visitorId: input.visitorId,
      sessionId: input.sessionId,
      idempotencyKey: input.idempotencyKey,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      consent: input.consent,
      smsConsent: input.smsConsent,
      source: input.source,
      landingPage: input.landingPage,
      referrer: input.referrer,
      utm: input.utm,
      fingerprint,
      summary,
      interest,
      leadType: input.leadType,
      company: input.company,
      eventDate: input.eventDate,
      estimatedPlayers: input.estimatedPlayers,
      foodBeverage: input.foodBeverage,
      membershipInterest: input.membershipInterest,
      comments: input.comments,
    });

    if (conversation && summary) await updateConversationSummary(conversation.id, summary);

    if (!result.duplicate) {
      // Fire-and-forget so a slow email provider never blocks the visitor.
      void sendNewLeadNotification({ lead: result.lead, coach: context.data.coach, summary }).catch(() => {});
    }

    return Response.json(
      { leadId: result.lead.id, duplicate: result.duplicate },
      { status: result.duplicate ? 200 : 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "UNKNOWN";
    if (message === "WIDGET_NOT_FOUND") return Response.json({ error: "Widget not found." }, { status: 404 });
    return Response.json({ error: "We could not save your details. Please try again." }, { status: 500 });
  }
}
