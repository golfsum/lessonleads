import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type {
  ChatMessage,
  ContentItem,
  Conversation,
  FaqItem,
  KnowledgeChunk,
  KnowledgeSource,
  Lead,
  LeadStatus,
  LessonWidget,
  PublicWidget,
  Service,
  SwingUpload,
  UtmValues,
  VisitorProfile,
  WidgetEvent,
  WidgetEventName,
  WorkspaceData,
} from "@/lib/domain/types";
import { intentLevelForScore } from "@/lib/domain/types";
import { slugify } from "@/lib/domain/format";
import { chunkText } from "@/lib/knowledge/chunk";
import type { ScannedPage, WebsiteScanResult } from "@/lib/knowledge/scan";
import { toPublicWidget } from "@/lib/data/mappers";
import { createDemoWorkspace } from "./seed";

const dataDirectory = path.join(process.cwd(), ".data");
const dataFile = path.join(dataDirectory, "lessonleads-demo.json");

let writeQueue = Promise.resolve();

export function isDemoMode() {
  return process.env.LESSONLEADS_DEMO_MODE === "true";
}

async function persist(data: WorkspaceData) {
  await mkdir(dataDirectory, { recursive: true });
  const payload = JSON.stringify(data, null, 2);
  const temporary = `${dataFile}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temporary, payload, "utf8");
  // Windows cannot always replace an existing file with rename if another
  // request still has it open. Retry, then fall back to a direct write.
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await rename(temporary, dataFile);
      return;
    } catch (error) {
      const code = error && typeof error === "object" && "code" in error ? String(error.code) : "";
      if (code !== "EPERM" && code !== "EACCES" && code !== "EEXIST") throw error;
      await new Promise((resolve) => setTimeout(resolve, 25 * (attempt + 1)));
    }
  }
  await writeFile(dataFile, payload, "utf8");
  await unlink(temporary).catch(() => undefined);
}

export async function readDemoWorkspace(): Promise<WorkspaceData> {
  try {
    const raw = await readFile(dataFile, "utf8");
    const data = JSON.parse(raw) as WorkspaceData;
    // Older data files from the pre-pivot product lack the new shape; reseed.
    if (!data.widget || !Array.isArray(data.conversations) || !Array.isArray(data.knowledgeChunks)) {
      const seed = createDemoWorkspace();
      await persist(seed);
      return seed;
    }
    return data;
  } catch {
    const seed = createDemoWorkspace();
    await persist(seed);
    return seed;
  }
}

async function mutateDemoWorkspace<T>(mutation: (data: WorkspaceData) => T | Promise<T>) {
  let result!: T;
  writeQueue = writeQueue.then(async () => {
    const data = await readDemoWorkspace();
    result = await mutation(data);
    await persist(data);
  });
  await writeQueue;
  return result;
}

export async function resetDemoWorkspace() {
  const seed = createDemoWorkspace();
  await persist(seed);
  return seed;
}

/** Pure projection of workspace data to the public widget payload. Also used by the dashboard preview. */
export { toPublicWidget } from "@/lib/data/mappers";

export async function getDemoPublicWidget(publicIdOrSlug: string): Promise<PublicWidget | null> {
  const data = await readDemoWorkspace();
  const matches = data.widget.publicId === publicIdOrSlug || data.widget.slug === publicIdOrSlug;
  if (!matches || data.widget.status !== "active") return null;
  return toPublicWidget(data);
}

export interface ChatContext {
  data: WorkspaceData;
  publicWidget: PublicWidget;
  includedChunks: KnowledgeChunk[];
}

export async function getDemoChatContext(publicIdOrSlug: string): Promise<ChatContext | null> {
  const data = await readDemoWorkspace();
  const matches = data.widget.publicId === publicIdOrSlug || data.widget.slug === publicIdOrSlug;
  if (!matches || data.widget.status !== "active") return null;
  const includedSourceIds = new Set(
    data.knowledgeSources.filter((source) => source.includeInAi && source.status !== "disabled").map((source) => source.id),
  );
  return {
    data,
    publicWidget: toPublicWidget(data),
    includedChunks: data.knowledgeChunks.filter((chunk) => includedSourceIds.has(chunk.sourceId)),
  };
}

export async function appendDemoConversationTurn(input: {
  widgetId: string;
  conversationId?: string;
  visitorId: string;
  sessionId: string;
  visitorMessage: Omit<ChatMessage, "id" | "conversationId" | "createdAt">;
  assistantMessage: Omit<ChatMessage, "id" | "conversationId" | "createdAt">;
  profileUpdates: Partial<VisitorProfile>;
  intentScore: number;
  recommendedServiceId?: string;
  page?: string;
  referrer?: string;
  utm?: UtmValues;
  device?: "mobile" | "desktop";
  preview?: boolean;
}): Promise<{ conversation: Conversation; assistantMessage: ChatMessage }> {
  return mutateDemoWorkspace((data) => {
    const now = new Date().toISOString();
    let conversation = input.conversationId
      ? data.conversations.find((candidate) => candidate.id === input.conversationId)
      : undefined;
    if (!conversation) {
      conversation = {
        id: randomUUID(),
        organizationId: data.organization.id,
        widgetId: input.widgetId,
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
      data.conversations.unshift(conversation);
    }
    const visitorMessage: ChatMessage = { ...input.visitorMessage, id: randomUUID(), conversationId: conversation.id, createdAt: now };
    const assistantMessage: ChatMessage = { ...input.assistantMessage, id: randomUUID(), conversationId: conversation.id, createdAt: now };
    conversation.messages.push(visitorMessage, assistantMessage);
    conversation.profile = { ...conversation.profile, ...input.profileUpdates };
    conversation.intentScore = input.intentScore;
    conversation.intentLevel = intentLevelForScore(input.intentScore);
    if (input.recommendedServiceId) conversation.recommendedServiceId = input.recommendedServiceId;
    conversation.lastMessageAt = now;

    // Keep the linked lead's intent in sync as the conversation develops.
    if (conversation.leadId) {
      const lead = data.leads.find((candidate) => candidate.id === conversation.leadId);
      if (lead) {
        lead.intentScore = conversation.intentScore;
        lead.intentLevel = conversation.intentLevel;
        if (input.recommendedServiceId) lead.recommendedServiceId = input.recommendedServiceId;
        lead.updatedAt = now;
      }
    }
    return { conversation, assistantMessage };
  });
}

export async function getDemoConversation(conversationId: string): Promise<Conversation | null> {
  const data = await readDemoWorkspace();
  return data.conversations.find((candidate) => candidate.id === conversationId) ?? null;
}

export async function recordDemoEvent(input: {
  widgetId: string;
  name: WidgetEventName;
  sessionId: string;
  leadId?: string;
  conversationId?: string;
  properties?: Record<string, string | number | boolean | null>;
}) {
  return mutateDemoWorkspace((data) => {
    const oncePerSession: WidgetEventName[] = ["widget_view", "widget_open", "conversation_started", "lead_captured", "booking_clicked", "swing_uploaded"];
    if (oncePerSession.includes(input.name)) {
      const duplicate = data.events.find(
        (event) => event.widgetId === input.widgetId && event.name === input.name && event.sessionId === input.sessionId,
      );
      if (duplicate) return duplicate;
    }
    const event: WidgetEvent = {
      id: randomUUID(),
      organizationId: data.organization.id,
      occurredAt: new Date().toISOString(),
      ...input,
    };
    data.events.push(event);
    // Booking clicks reported from the widget also mark the lead.
    if (input.name === "booking_clicked" && input.leadId) {
      const lead = data.leads.find((candidate) => candidate.id === input.leadId);
      if (lead && !lead.bookingClickedAt) {
        lead.bookingClickedAt = event.occurredAt;
        lead.updatedAt = event.occurredAt;
        lead.activity.push({ id: randomUUID(), type: "booking_clicked", label: "Booking link clicked", occurredAt: event.occurredAt });
      }
    }
    return event;
  });
}

export async function countRecentDemoLeads(fingerprint: string, minutes = 15) {
  const data = await readDemoWorkspace();
  const threshold = Date.now() - minutes * 60_000;
  return data.events.filter(
    (event) =>
      event.name === "lead_captured" &&
      event.properties?.fingerprint === fingerprint &&
      new Date(event.occurredAt).getTime() >= threshold,
  ).length;
}

export async function countDemoLeadsThisMonth(organizationId?: string): Promise<number> {
  const data = await readDemoWorkspace();
  if (organizationId && data.organization.id !== organizationId) return 0;
  const now = new Date();
  return data.leads.filter((lead) => {
    const date = new Date(lead.createdAt);
    return date.getUTCFullYear() === now.getUTCFullYear() && date.getUTCMonth() === now.getUTCMonth();
  }).length;
}

export async function countDemoConversationsThisMonth(_organizationId?: string): Promise<number> {
  const data = await readDemoWorkspace();
  const nowDate = new Date();
  return data.events.filter((event) => {
    if (event.name !== "conversation_started") return false;
    const date = new Date(event.occurredAt);
    return date.getUTCFullYear() === nowDate.getUTCFullYear() && date.getUTCMonth() === nowDate.getUTCMonth();
  }).length;
}

export async function captureDemoLead(input: {
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
  utm?: UtmValues;
  fingerprint: string;
  summary?: string;
  interest?: string;
}) {
  return mutateDemoWorkspace((data) => {
    const existing = data.leads.find((lead) => lead.idempotencyKey === input.idempotencyKey);
    if (existing) return { lead: existing, duplicate: true };

    const widget = data.widget;
    if ((widget.publicId !== input.widgetPublicId && widget.slug !== input.widgetPublicId) || widget.status !== "active") {
      throw new Error("WIDGET_NOT_FOUND");
    }

    const conversation = input.conversationId
      ? data.conversations.find((candidate) => candidate.id === input.conversationId)
      : undefined;

    const now = new Date().toISOString();
    const leadId = randomUUID();
    const lead: Lead = {
      id: leadId,
      organizationId: data.organization.id,
      widgetId: widget.id,
      conversationId: conversation?.id,
      visitorId: input.visitorId,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email.toLowerCase(),
      phone: input.phone,
      consent: input.consent,
      smsConsent: input.smsConsent,
      status: "new",
      intentScore: conversation?.intentScore ?? 20,
      intentLevel: conversation ? conversation.intentLevel : intentLevelForScore(20),
      interest: input.interest,
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
    data.leads.unshift(lead);
    if (conversation) {
      conversation.leadId = leadId;
      if (input.summary) conversation.summary = input.summary;
    }

    // Attach any swing uploads from this visitor session to the new lead.
    for (const upload of data.swingUploads) {
      if (!upload.leadId && (upload.visitorId === input.visitorId || upload.conversationId === conversation?.id)) {
        upload.leadId = leadId;
      }
    }

    data.events.push({
      id: randomUUID(),
      organizationId: data.organization.id,
      widgetId: widget.id,
      leadId,
      conversationId: conversation?.id,
      name: "lead_captured",
      sessionId: input.sessionId,
      occurredAt: now,
      properties: { fingerprint: input.fingerprint },
    });
    return { lead, duplicate: false };
  });
}

export async function saveDemoSwingUpload(input: {
  widgetPublicId: string;
  conversationId?: string;
  visitorId: string;
  sessionId: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  club?: string;
  typicalMiss?: string;
  handicap?: string;
  goal?: string;
}) {
  return mutateDemoWorkspace((data) => {
    const widget = data.widget;
    if ((widget.publicId !== input.widgetPublicId && widget.slug !== input.widgetPublicId) || widget.status !== "active") {
      throw new Error("WIDGET_NOT_FOUND");
    }
    const now = new Date().toISOString();
    const lead = data.leads.find((candidate) => candidate.visitorId === input.visitorId);
    const upload: SwingUpload = {
      id: randomUUID(),
      organizationId: data.organization.id,
      widgetId: widget.id,
      conversationId: input.conversationId,
      leadId: lead?.id,
      visitorId: input.visitorId,
      fileName: input.fileName,
      filePath: input.filePath,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      club: input.club,
      typicalMiss: input.typicalMiss,
      handicap: input.handicap,
      goal: input.goal,
      createdAt: now,
    };
    data.swingUploads.unshift(upload);
    if (lead) {
      lead.activity.push({ id: randomUUID(), type: "swing_uploaded", label: `Swing video uploaded${input.club ? ` (${input.club})` : ""}`, occurredAt: now });
      lead.updatedAt = now;
      lead.intentScore = Math.min(100, lead.intentScore + 35);
      lead.intentLevel = intentLevelForScore(lead.intentScore);
    }
    data.events.push({
      id: randomUUID(),
      organizationId: data.organization.id,
      widgetId: widget.id,
      leadId: lead?.id,
      conversationId: input.conversationId,
      name: "swing_uploaded",
      sessionId: input.sessionId,
      occurredAt: now,
    });
    return upload;
  });
}

export async function recordDemoBookingClick(token: string) {
  return mutateDemoWorkspace((data) => {
    const lead = data.leads.find((candidate) => candidate.bookingToken === token);
    if (!lead) return null;
    const service = data.services.find((candidate) => candidate.id === lead.recommendedServiceId);
    const destination = service?.bookingUrl || data.coach.bookingUrl;
    if (!lead.bookingClickedAt) {
      const occurredAt = new Date().toISOString();
      lead.bookingClickedAt = occurredAt;
      lead.updatedAt = occurredAt;
      lead.activity.push({ id: randomUUID(), type: "booking_clicked", label: "Booking link clicked", occurredAt });
      data.events.push({
        id: randomUUID(),
        organizationId: data.organization.id,
        widgetId: lead.widgetId,
        leadId: lead.id,
        conversationId: lead.conversationId,
        name: "booking_clicked",
        sessionId: lead.sessionId,
        occurredAt,
      });
    }
    return { lead, destination };
  });
}

export async function updateDemoLeadStatus(leadId: string, status: LeadStatus) {
  return mutateDemoWorkspace((data) => {
    const lead = data.leads.find((candidate) => candidate.id === leadId);
    if (!lead) return null;
    lead.status = status;
    lead.updatedAt = new Date().toISOString();
    lead.activity.push({ id: randomUUID(), type: "status_changed", label: `Status changed to ${status.replaceAll("_", " ")}`, occurredAt: lead.updatedAt });
    return lead;
  });
}

export async function updateDemoLeadNotes(leadId: string, notes: string) {
  return mutateDemoWorkspace((data) => {
    const lead = data.leads.find((candidate) => candidate.id === leadId);
    if (!lead) return null;
    lead.notes = notes;
    lead.updatedAt = new Date().toISOString();
    return lead;
  });
}

export async function saveDemoOnboarding(input: {
  coachName: string;
  businessName: string;
  email: string;
  website?: string;
  location: string;
  timezone: string;
  bookingProvider: WorkspaceData["coach"]["bookingProvider"];
  bookingUrl: string;
  enabledSections: string[];
  assistantName?: string;
  welcomeMessage?: string;
  primaryColor?: string;
  logoUrl?: string;
}) {
  return mutateDemoWorkspace((data) => {
    data.organization.name = input.businessName;
    Object.assign(data.coach, {
      name: input.coachName,
      businessName: input.businessName,
      email: input.email,
      website: input.website ?? data.coach.website,
      location: input.location,
      timezone: input.timezone,
      bookingProvider: input.bookingProvider,
      bookingUrl: input.bookingUrl,
    });
    const firstName = input.coachName.split(" ")[0] || input.coachName;
    const theme = data.widget.theme;
    theme.assistantName = input.assistantName || `Ask ${firstName}`;
    if (input.welcomeMessage) theme.welcomeMessage = input.welcomeMessage;
    if (input.primaryColor) {
      theme.primaryColor = input.primaryColor;
      theme.buttonColor = input.primaryColor;
    }
    if (input.logoUrl !== undefined) {
      theme.logoUrl = input.logoUrl.trim() ? input.logoUrl.trim() : undefined;
    }
    theme.launcherText = `Ask Coach ${firstName}`;
    for (const item of data.widget.menu) {
      item.enabled = input.enabledSections.includes(item.key);
      if (item.key === "ask") {
        item.enabled = true;
        item.title = `Ask ${firstName}`;
      }
      if (item.key === "coach") item.title = `About ${firstName}`;
    }
    data.widget.status = "active";
    data.widget.updatedAt = new Date().toISOString();
    return data;
  });
}

export async function upsertDemoService(input: {
  id?: string;
  name: string;
  description: string;
  priceCents: number | null;
  priceLabel?: string;
  durationMinutes: number | null;
  mode: Service["mode"];
  location?: string;
  bookingUrl?: string;
  ctaLabel?: string;
  featured: boolean;
  bestFor: string[];
  active: boolean;
}) {
  return mutateDemoWorkspace((data) => {
    const existing = input.id ? data.services.find((service) => service.id === input.id) : undefined;
    if (existing) {
      Object.assign(existing, input);
      return existing;
    }
    const service: Service = {
      ...input,
      id: randomUUID(),
      organizationId: data.organization.id,
      coachId: data.coach.id,
      slug: `${slugify(input.name)}-${Date.now().toString(36)}`,
      sortOrder: data.services.length + 1,
    };
    data.services.push(service);
    return service;
  });
}

export async function deleteDemoService(serviceId: string) {
  return mutateDemoWorkspace((data) => {
    const index = data.services.findIndex((service) => service.id === serviceId);
    if (index === -1) return false;
    data.services.splice(index, 1);
    return true;
  });
}

export async function saveDemoWidget(input: {
  theme?: Partial<LessonWidget["theme"]>;
  menu?: LessonWidget["menu"];
  status?: LessonWidget["status"];
  allowedOrigins?: string[];
  defaultSectionKey?: LessonWidget["defaultSectionKey"];
}) {
  return mutateDemoWorkspace((data) => {
    const widget = data.widget;
    if (input.theme) widget.theme = { ...widget.theme, ...input.theme };
    if (input.menu) widget.menu = input.menu;
    if (input.status) widget.status = input.status;
    if (input.allowedOrigins) widget.allowedOrigins = input.allowedOrigins;
    if (input.defaultSectionKey) widget.defaultSectionKey = input.defaultSectionKey;
    widget.updatedAt = new Date().toISOString();
    return widget;
  });
}

export async function updateDemoCoachProfile(input: Partial<Omit<WorkspaceData["coach"], "id" | "organizationId">>) {
  return mutateDemoWorkspace((data) => {
    Object.assign(data.coach, input);
    return data.coach;
  });
}

/** Apply a completed website scan: upsert page sources + chunks + detected FAQs. */
export async function applyDemoWebsiteScan(scan: WebsiteScanResult) {
  return mutateDemoWorkspace((data) => {
    const now = new Date().toISOString();
    data.website = {
      url: scan.baseUrl,
      scanStatus: "scanned",
      lastScanAt: now,
      pagesFound: scan.pages.length,
    };
    data.coach.website = scan.baseUrl;
    // Prefill social links the coach hasn't set yet.
    for (const [key, value] of Object.entries(scan.detected.socialLinks)) {
      const socials = data.coach.socialLinks as Record<string, string | undefined>;
      if (!socials[key]) socials[key] = value;
    }

    for (const page of scan.pages) {
      applyScannedPage(data, page, now);
    }
    return data.knowledgeSources.filter((source) => source.type === "website_page" || source.type === "faq");
  });
}

function applyScannedPage(data: WorkspaceData, page: ScannedPage, now: string) {
  const type = page.looksLikeFaq && page.faqs.length > 0 ? "faq" : "website_page";
  let source = data.knowledgeSources.find((candidate) => candidate.url === page.url);
  if (!source) {
    source = {
      id: randomUUID(),
      organizationId: data.organization.id,
      coachId: data.coach.id,
      type,
      title: page.title,
      url: page.url,
      status: "synced",
      includeInAi: true,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    data.knowledgeSources.push(source);
  } else {
    source.title = page.title;
    source.status = "synced";
    source.lastSyncedAt = now;
    source.updatedAt = now;
    source.error = undefined;
  }
  // Re-index: replace this source's chunks instead of accumulating duplicates.
  data.knowledgeChunks = data.knowledgeChunks.filter((chunk) => chunk.sourceId !== source.id);
  const chunks = chunkText(page.text);
  chunks.forEach((content, index) => {
    data.knowledgeChunks.push({
      id: randomUUID(),
      organizationId: data.organization.id,
      coachId: data.coach.id,
      sourceId: source.id,
      sourceType: source.type,
      title: page.title,
      url: page.url,
      content,
      position: index,
      updatedAt: now,
    });
  });
  // Structured FAQs replace previous ones from the same source.
  if (page.faqs.length > 0) {
    data.faqs = data.faqs.filter((faq) => faq.sourceId !== source.id);
    page.faqs.forEach((faq, index) => {
      data.faqs.push({
        id: randomUUID(),
        organizationId: data.organization.id,
        sourceId: source.id,
        question: faq.question,
        answer: faq.answer,
        enabled: true,
        sortOrder: data.faqs.length + index + 1,
      });
    });
  }
}

export async function resyncDemoSource(sourceId: string, page: ScannedPage) {
  return mutateDemoWorkspace((data) => {
    const source = data.knowledgeSources.find((candidate) => candidate.id === sourceId);
    if (!source) return null;
    applyScannedPage(data, page, new Date().toISOString());
    return data.knowledgeSources.find((candidate) => candidate.url === page.url) ?? null;
  });
}

export async function addDemoScannedPage(page: ScannedPage) {
  return mutateDemoWorkspace((data) => {
    applyScannedPage(data, page, new Date().toISOString());
    return data.knowledgeSources.find((candidate) => candidate.url === page.url)!;
  });
}

export async function setDemoWebsiteScanStatus(status: WorkspaceData["website"]["scanStatus"], url?: string, error?: string) {
  return mutateDemoWorkspace((data) => {
    data.website.scanStatus = status;
    if (url) data.website.url = url;
    data.website.error = error;
    return data.website;
  });
}

export async function addDemoManualKnowledge(input: { title: string; content: string }) {
  return mutateDemoWorkspace((data) => {
    const now = new Date().toISOString();
    const source: KnowledgeSource = {
      id: randomUUID(),
      organizationId: data.organization.id,
      coachId: data.coach.id,
      type: "manual",
      title: input.title,
      status: "synced",
      includeInAi: true,
      lastSyncedAt: now,
      createdAt: now,
      updatedAt: now,
    };
    data.knowledgeSources.push(source);
    chunkText(input.content).forEach((content, index) => {
      data.knowledgeChunks.push({
        id: randomUUID(),
        organizationId: data.organization.id,
        coachId: data.coach.id,
        sourceId: source.id,
        sourceType: "manual",
        title: input.title,
        content,
        position: index,
        updatedAt: now,
      });
    });
    return source;
  });
}

export async function setDemoSourceIncluded(sourceId: string, includeInAi: boolean) {
  return mutateDemoWorkspace((data) => {
    const source = data.knowledgeSources.find((candidate) => candidate.id === sourceId);
    if (!source) return null;
    source.includeInAi = includeInAi;
    source.status = includeInAi ? "synced" : "disabled";
    source.updatedAt = new Date().toISOString();
    return source;
  });
}

export async function deleteDemoSource(sourceId: string) {
  return mutateDemoWorkspace((data) => {
    const index = data.knowledgeSources.findIndex((source) => source.id === sourceId);
    if (index === -1) return false;
    data.knowledgeSources.splice(index, 1);
    data.knowledgeChunks = data.knowledgeChunks.filter((chunk) => chunk.sourceId !== sourceId);
    data.faqs = data.faqs.filter((faq) => faq.sourceId !== sourceId);
    return true;
  });
}

export async function upsertDemoFaq(input: { id?: string; question: string; answer: string; enabled: boolean }) {
  return mutateDemoWorkspace((data) => {
    const existing = input.id ? data.faqs.find((faq) => faq.id === input.id) : undefined;
    if (existing) {
      Object.assign(existing, input);
      return existing;
    }
    const faq: FaqItem = {
      id: randomUUID(),
      organizationId: data.organization.id,
      question: input.question,
      answer: input.answer,
      enabled: input.enabled,
      sortOrder: data.faqs.length + 1,
    };
    data.faqs.push(faq);
    return faq;
  });
}

export async function deleteDemoFaq(faqId: string) {
  return mutateDemoWorkspace((data) => {
    const index = data.faqs.findIndex((faq) => faq.id === faqId);
    if (index === -1) return false;
    data.faqs.splice(index, 1);
    return true;
  });
}

export async function addDemoContentItems(items: Array<Omit<ContentItem, "id" | "organizationId" | "coachId" | "sortOrder" | "createdAt">>) {
  return mutateDemoWorkspace((data) => {
    const now = new Date().toISOString();
    const created: ContentItem[] = [];
    for (const item of items) {
      // Skip duplicates by URL.
      if (data.contentItems.some((existing) => existing.url === item.url)) continue;
      const contentItem: ContentItem = {
        ...item,
        id: randomUUID(),
        organizationId: data.organization.id,
        coachId: data.coach.id,
        sortOrder: data.contentItems.length + created.length + 1,
        createdAt: now,
      };
      data.contentItems.push(contentItem);
      created.push(contentItem);
      // Index title/description so the AI can recommend the video.
      const indexText = [contentItem.title, contentItem.description ?? ""].filter(Boolean).join("\n");
      const source: KnowledgeSource = {
        id: `content_${contentItem.id}`,
        organizationId: data.organization.id,
        coachId: data.coach.id,
        type: "youtube_video",
        title: contentItem.title,
        url: contentItem.url,
        status: "synced",
        includeInAi: contentItem.includeInAi,
        lastSyncedAt: now,
        createdAt: now,
        updatedAt: now,
      };
      data.knowledgeSources.push(source);
      chunkText(indexText).forEach((content, index) => {
        data.knowledgeChunks.push({
          id: randomUUID(),
          organizationId: data.organization.id,
          coachId: data.coach.id,
          sourceId: source.id,
          sourceType: "youtube_video",
          title: contentItem.title,
          url: contentItem.url,
          category: contentItem.categories[0],
          content,
          position: index,
          updatedAt: now,
        });
      });
    }
    return created;
  });
}

export async function updateDemoContentItem(input: { id: string } & Partial<Pick<ContentItem, "title" | "description" | "categories" | "includeInAi" | "active">>) {
  return mutateDemoWorkspace((data) => {
    const item = data.contentItems.find((candidate) => candidate.id === input.id);
    if (!item) return null;
    Object.assign(item, input);
    const source = data.knowledgeSources.find((candidate) => candidate.id === `content_${item.id}`);
    if (source && input.includeInAi !== undefined) {
      source.includeInAi = input.includeInAi;
      source.status = input.includeInAi ? "synced" : "disabled";
    }
    return item;
  });
}

export async function deleteDemoContentItem(contentId: string) {
  return mutateDemoWorkspace((data) => {
    const index = data.contentItems.findIndex((item) => item.id === contentId);
    if (index === -1) return false;
    data.contentItems.splice(index, 1);
    const sourceId = `content_${contentId}`;
    data.knowledgeSources = data.knowledgeSources.filter((source) => source.id !== sourceId);
    data.knowledgeChunks = data.knowledgeChunks.filter((chunk) => chunk.sourceId !== sourceId);
    return true;
  });
}

export async function updateDemoConversationSummary(conversationId: string, summary: string) {
  return mutateDemoWorkspace((data) => {
    const conversation = data.conversations.find((candidate) => candidate.id === conversationId);
    if (!conversation) return null;
    conversation.summary = summary;
    if (conversation.leadId) {
      const lead = data.leads.find((candidate) => candidate.id === conversation.leadId);
      if (lead) lead.summary = summary;
    }
    return conversation;
  });
}
