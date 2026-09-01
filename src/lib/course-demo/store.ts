import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { toPublicWidget } from "@/lib/data/mappers";
import { intentLevelForScore, type ChatMessage, type Conversation, type Lead, type PublicWidget, type WidgetEvent, type WidgetEventName } from "@/lib/domain/types";
import type { ChatContext } from "@/lib/demo/store";
import { buildCourseDemoWorkspace } from "./data";
import {
  COURSE_DEMO_CONVERSATION_PREFIX,
  COURSE_DEMO_ORG_ID,
  COURSE_DEMO_WIDGET_ID,
  isCourseDemoPublicId,
} from "./ids";

type CourseMemory = {
  conversations: Conversation[];
  leads: Lead[];
  events: WidgetEvent[];
};

const globalStore = globalThis as typeof globalThis & { __lessonleadsCourseDemo?: CourseMemory };

function memory(): CourseMemory {
  globalStore.__lessonleadsCourseDemo ??= { conversations: [], leads: [], events: [] };
  return globalStore.__lessonleadsCourseDemo;
}

function workspaceView() {
  const data = buildCourseDemoWorkspace();
  const mem = memory();
  return { ...data, conversations: mem.conversations, leads: mem.leads, events: mem.events };
}

export function getCourseDemoPublicWidget(): PublicWidget {
  return toPublicWidget(buildCourseDemoWorkspace());
}

export function getCourseDemoChatContext(): ChatContext {
  const data = workspaceView();
  return {
    data,
    publicWidget: toPublicWidget(data),
    includedChunks: data.knowledgeChunks,
  };
}

export function getCourseDemoConversation(conversationId: string): Conversation | null {
  return memory().conversations.find((candidate) => candidate.id === conversationId) ?? null;
}

export async function appendCourseDemoConversationTurn(input: {
  widgetId: string;
  conversationId?: string;
  visitorId: string;
  sessionId: string;
  visitorMessage: Omit<ChatMessage, "id" | "conversationId" | "createdAt">;
  assistantMessage: Omit<ChatMessage, "id" | "conversationId" | "createdAt">;
  profileUpdates: Partial<Conversation["profile"]>;
  intentScore: number;
  recommendedServiceId?: string;
  page?: string;
  referrer?: string;
  utm?: Conversation["utm"];
  device?: "mobile" | "desktop";
  preview?: boolean;
}): Promise<{ conversation: Conversation; assistantMessage: ChatMessage }> {
  const mem = memory();
  const now = new Date().toISOString();
  let conversation = input.conversationId
    ? mem.conversations.find((candidate) => candidate.id === input.conversationId)
    : undefined;
  if (!conversation) {
    conversation = {
      id: `${COURSE_DEMO_CONVERSATION_PREFIX}${randomUUID()}`,
      organizationId: COURSE_DEMO_ORG_ID,
      widgetId: COURSE_DEMO_WIDGET_ID,
      visitorId: input.visitorId,
      sessionId: input.sessionId,
      messages: [],
      profile: {},
      intentScore: 0,
      intentLevel: "low",
      page: input.page,
      referrer: input.referrer,
      utm: input.utm,
      device: input.device,
      preview: input.preview === true,
      startedAt: now,
      lastMessageAt: now,
    };
    mem.conversations.unshift(conversation);
  }
  const visitorMessage: ChatMessage = { ...input.visitorMessage, id: randomUUID(), conversationId: conversation.id, createdAt: now };
  const assistantMessage: ChatMessage = { ...input.assistantMessage, id: randomUUID(), conversationId: conversation.id, createdAt: now };
  conversation.messages.push(visitorMessage, assistantMessage);
  conversation.profile = { ...conversation.profile, ...input.profileUpdates };
  conversation.intentScore = input.intentScore;
  conversation.intentLevel = intentLevelForScore(input.intentScore);
  if (input.recommendedServiceId) conversation.recommendedServiceId = input.recommendedServiceId;
  conversation.lastMessageAt = now;
  if (conversation.leadId) {
    const lead = mem.leads.find((candidate) => candidate.id === conversation.leadId);
    if (lead) {
      lead.intentScore = conversation.intentScore;
      lead.intentLevel = conversation.intentLevel;
      if (input.recommendedServiceId) lead.recommendedServiceId = input.recommendedServiceId;
      lead.updatedAt = now;
    }
  }
  return { conversation, assistantMessage };
}

export async function updateCourseDemoConversationSummary(conversationId: string, summary: string) {
  const conversation = getCourseDemoConversation(conversationId);
  if (conversation) conversation.summary = summary;
}

export async function captureCourseDemoLead(input: {
  widgetPublicId: string;
  conversationId?: string;
  visitorId: string;
  sessionId: string;
  idempotencyKey: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  consent: boolean;
  smsConsent: boolean;
  source: Lead["source"];
  landingPage?: string;
  referrer?: string;
  utm?: Lead["utm"];
  fingerprint: string;
  summary?: string;
  interest?: string;
  leadType?: Lead["leadType"];
  company?: string;
  eventDate?: string;
  estimatedPlayers?: number;
  foodBeverage?: string;
  membershipInterest?: string;
  comments?: string;
}) {
  if (!isCourseDemoPublicId(input.widgetPublicId)) throw new Error("WIDGET_NOT_FOUND");
  const mem = memory();
  const existing = mem.leads.find((lead) => lead.idempotencyKey === input.idempotencyKey);
  if (existing) return { lead: existing, duplicate: true as const };

  const conversation = input.conversationId
    ? mem.conversations.find((candidate) => candidate.id === input.conversationId)
    : undefined;
  const now = new Date().toISOString();
  const leadId = randomUUID();
  const lead: Lead = {
    id: leadId,
    organizationId: COURSE_DEMO_ORG_ID,
    widgetId: COURSE_DEMO_WIDGET_ID,
    conversationId: conversation?.id,
    visitorId: input.visitorId,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email.toLowerCase(),
    phone: input.phone,
    consent: input.consent,
    smsConsent: input.smsConsent,
    status: "new",
    leadType: input.leadType ?? "general",
    intentScore: conversation?.intentScore ?? 20,
    intentLevel: conversation ? conversation.intentLevel : intentLevelForScore(20),
    interest: input.interest,
    company: input.company,
    eventDate: input.eventDate,
    estimatedPlayers: input.estimatedPlayers,
    foodBeverage: input.foodBeverage,
    membershipInterest: input.membershipInterest,
    comments: input.comments,
    source: input.source,
    sessionId: input.sessionId,
    idempotencyKey: input.idempotencyKey,
    bookingToken: createHash("sha256").update(`${leadId}:${randomUUID()}`).digest("hex"),
    recommendedServiceId: conversation?.recommendedServiceId,
    summary: input.summary,
    landingPage: input.landingPage,
    referrer: input.referrer,
    utm: input.utm,
    createdAt: now,
    updatedAt: now,
    activity: [
      ...(conversation ? [{ id: randomUUID(), type: "conversation" as const, label: "Started a conversation", occurredAt: conversation.startedAt }] : []),
      { id: randomUUID(), type: "lead_captured" as const, label: "Lead captured", occurredAt: now },
    ],
  };
  mem.leads.unshift(lead);
  if (conversation) {
    conversation.leadId = leadId;
    if (input.summary) conversation.summary = input.summary;
  }
  mem.events.push({
    id: randomUUID(),
    organizationId: COURSE_DEMO_ORG_ID,
    widgetId: COURSE_DEMO_WIDGET_ID,
    leadId,
    conversationId: conversation?.id,
    name: "lead_captured",
    sessionId: input.sessionId,
    occurredAt: now,
    properties: { fingerprint: input.fingerprint, lead_type: lead.leadType },
  });
  return { lead, duplicate: false as const };
}

export async function recordCourseDemoEvent(input: {
  widgetId: string;
  name: WidgetEventName;
  sessionId: string;
  leadId?: string;
  conversationId?: string;
  properties?: Record<string, string | number | boolean | null>;
}) {
  const mem = memory();
  const oncePerSession: WidgetEventName[] = ["widget_view", "widget_open", "conversation_started", "lead_captured"];
  if (oncePerSession.includes(input.name)) {
    const duplicate = mem.events.find(
      (event) => event.widgetId === input.widgetId && event.name === input.name && event.sessionId === input.sessionId,
    );
    if (duplicate) return duplicate;
  }
  const event: WidgetEvent = {
    id: randomUUID(),
    organizationId: COURSE_DEMO_ORG_ID,
    occurredAt: new Date().toISOString(),
    ...input,
  };
  mem.events.push(event);
  return event;
}

export function countRecentCourseDemoLeadsByFingerprint(fingerprint: string, minutes = 15) {
  const threshold = Date.now() - minutes * 60_000;
  return memory().events.filter(
    (event) =>
      event.name === "lead_captured" &&
      event.properties?.fingerprint === fingerprint &&
      new Date(event.occurredAt).getTime() >= threshold,
  ).length;
}

export function countCourseDemoConversationsThisMonth() {
  const nowDate = new Date();
  return memory().events.filter((event) => {
    if (event.name !== "conversation_started") return false;
    const date = new Date(event.occurredAt);
    return date.getUTCFullYear() === nowDate.getUTCFullYear() && date.getUTCMonth() === nowDate.getUTCMonth();
  }).length;
}

export function countCourseDemoLeadsThisMonth() {
  const nowDate = new Date();
  return memory().leads.filter((lead) => {
    const date = new Date(lead.createdAt);
    return date.getUTCFullYear() === nowDate.getUTCFullYear() && date.getUTCMonth() === nowDate.getUTCMonth();
  }).length;
}
