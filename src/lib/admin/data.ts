import "server-only";

import { hasInternalAdminSession } from "@/lib/auth/session";
import { conversationLimit, isPlanId } from "@/lib/billing/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ADMIN_TICKET_CATEGORIES,
  ADMIN_TICKET_PRIORITIES,
  ADMIN_TICKET_STATUSES,
  type AdminTicketCategory,
  type AdminTicketPriority,
  type AdminTicketStatus,
} from "@/lib/admin/ticket-types";

export { ADMIN_TICKET_CATEGORIES, ADMIN_TICKET_PRIORITIES, ADMIN_TICKET_STATUSES } from "@/lib/admin/ticket-types";
export type { AdminTicketCategory, AdminTicketPriority, AdminTicketStatus } from "@/lib/admin/ticket-types";
export type AdminSubscriptionPlan = "free" | "solo" | "pro" | "academy";
export type AdminSubscriptionStatus = "free" | "active" | "trialing" | "past_due" | "canceled";

export interface AdminClientSummary {
  organizationId: string;
  name: string;
  slug: string;
  createdAt: string;
  contactName?: string;
  contactEmail?: string;
  websiteUrl?: string;
  memberCount: number;
  plan: AdminSubscriptionPlan;
  subscriptionStatus: AdminSubscriptionStatus;
  currentPeriodEnd?: string;
  widgetId?: string;
  widgetPublicId?: string;
  widgetStatus: "draft" | "active" | "disabled" | "missing";
  allowedOrigins: string[];
  scanStatus: "never" | "scanning" | "scanned" | "error";
  scanError?: string;
  widgetSessions30d: number;
  conversations30d: number;
  leads30d: number;
  bookingClicks30d: number;
  lastWidgetActivityAt?: string;
  usageLimit: number;
  health: "healthy" | "attention" | "critical";
  healthReasons: string[];
}

export interface AdminHealthAlert {
  id: string;
  organizationId: string;
  organizationName: string;
  severity: "info" | "warning" | "critical";
  kind: "billing" | "widget" | "knowledge" | "inactivity";
  message: string;
}

export interface AdminOverview {
  siteSessions7d: number;
  siteSessions30d: number;
  pageViews30d: number;
  clients: number;
  users: number;
  newClients30d: number;
  widgetSessions30d: number;
  conversations30d: number;
  leads30d: number;
  bookingClicks30d: number;
  openTickets: number;
  planDistribution: Record<AdminSubscriptionPlan, number>;
  subscriptionDistribution: Record<AdminSubscriptionStatus, number>;
  healthAlerts: AdminHealthAlert[];
  recentClients: AdminClientSummary[];
  /** True when a high-volume distinct-session scan reached its safety cap. */
  metricsTruncated: boolean;
  generatedAt: string;
}

export interface AdminMember {
  userId: string;
  role: "owner" | "admin" | "member";
  email?: string;
  name?: string;
  joinedAt: string;
  lastSignInAt?: string;
}

export interface AdminRecentEvent {
  id: string;
  name: string;
  sessionId: string;
  occurredAt: string;
}

export interface AdminRecentConversation {
  id: string;
  intentLevel: string;
  preview: boolean;
  startedAt: string;
  lastMessageAt: string;
}

export interface AdminKnowledgeError {
  id: string;
  title: string;
  type: string;
  error: string;
  updatedAt: string;
}

export interface AdminTicketSummary {
  id: string;
  ticketNumber: number;
  organizationId: string;
  organizationName: string;
  createdBy?: string;
  subject: string;
  category: AdminTicketCategory;
  priority: AdminTicketPriority;
  status: AdminTicketStatus;
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface AdminTicketMessage {
  id: string;
  ticketId: string;
  senderUserId?: string;
  senderType: "customer" | "admin" | "system";
  senderEmail?: string;
  body: string;
  internal: boolean;
  createdAt: string;
}

export interface AdminTicketDetail extends AdminTicketSummary {
  createdByEmail?: string;
  assignedToEmail?: string;
  messages: AdminTicketMessage[];
}

export interface AdminClientDetail extends AdminClientSummary {
  members: AdminMember[];
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  monthlyUsage: {
    conversations: number;
    conversationLimit: number;
    leads: number;
    usagePercent: number;
  };
  totals: {
    conversations: number;
    leads: number;
    widgetEvents: number;
    openTickets: number;
  };
  recentEvents: AdminRecentEvent[];
  recentConversations: AdminRecentConversation[];
  knowledgeErrors: AdminKnowledgeError[];
  tickets: AdminTicketSummary[];
}

type Row = Record<string, unknown>;
type QueryError = { message: string; code?: string };
type PageResult = { data: unknown; error: QueryError | null };

const PAGE_SIZE = 1_000;
const DISTINCT_SCAN_LIMIT = 20_000;
const CLIENT_LIST_LIMIT = 200;

function rows(value: unknown): Row[] {
  return Array.isArray(value) ? value.filter((entry): entry is Row => Boolean(entry) && typeof entry === "object") : [];
}

function record(value: unknown): Row | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Row) : null;
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

function optionalText(value: unknown) {
  const valueText = text(value);
  return valueText || undefined;
}

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function throwIf(error: QueryError | null, context: string) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

function daysAgo(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function startOfUtcMonth() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function validUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

async function requireAdminActor() {
  if (!(await hasInternalAdminSession())) throw new Error("ADMIN_FORBIDDEN");
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) throw new Error("ADMIN_FORBIDDEN");
  return { id: user.id, email: user.email ?? "" };
}

async function scanRows(loadPage: (from: number, to: number) => PromiseLike<PageResult>, limit = DISTINCT_SCAN_LIMIT) {
  const collected: Row[] = [];
  let truncated = false;
  for (let from = 0; from < limit; from += PAGE_SIZE) {
    const result = await loadPage(from, Math.min(from + PAGE_SIZE - 1, limit - 1));
    throwIf(result.error, "admin metric scan");
    const page = rows(result.data);
    collected.push(...page);
    if (page.length < PAGE_SIZE) return { rows: collected, truncated };
  }
  truncated = true;
  return { rows: collected, truncated };
}

function planValue(value: unknown): AdminSubscriptionPlan {
  const candidate = text(value);
  return isPlanId(candidate) ? candidate : "free";
}

function subscriptionStatusValue(value: unknown): AdminSubscriptionStatus {
  const candidate = text(value);
  return ["free", "active", "trialing", "past_due", "canceled"].includes(candidate)
    ? (candidate as AdminSubscriptionStatus)
    : "free";
}

function ticketCategory(value: unknown): AdminTicketCategory {
  const candidate = text(value);
  return ADMIN_TICKET_CATEGORIES.includes(candidate as AdminTicketCategory) ? (candidate as AdminTicketCategory) : "general";
}

function ticketPriority(value: unknown): AdminTicketPriority {
  const candidate = text(value);
  return ADMIN_TICKET_PRIORITIES.includes(candidate as AdminTicketPriority) ? (candidate as AdminTicketPriority) : "normal";
}

function ticketStatus(value: unknown): AdminTicketStatus {
  const candidate = text(value);
  return ADMIN_TICKET_STATUSES.includes(candidate as AdminTicketStatus) ? (candidate as AdminTicketStatus) : "open";
}

function healthFor(input: {
  subscriptionStatus: AdminSubscriptionStatus;
  widgetStatus: AdminClientSummary["widgetStatus"];
  scanStatus: AdminClientSummary["scanStatus"];
  lastWidgetActivityAt?: string;
}) {
  const reasons: string[] = [];
  let health: AdminClientSummary["health"] = "healthy";
  if (input.subscriptionStatus === "past_due") {
    health = "critical";
    reasons.push("Subscription is past due.");
  }
  if (input.widgetStatus !== "active") {
    if (health !== "critical") health = "attention";
    reasons.push(input.widgetStatus === "missing" ? "Widget record is missing." : `Widget is ${input.widgetStatus}.`);
  }
  if (input.scanStatus === "error") {
    if (health !== "critical") health = "attention";
    reasons.push("Website knowledge scan has an error.");
  }
  if (input.widgetStatus === "active" && !input.lastWidgetActivityAt) {
    if (health !== "critical") health = "attention";
    reasons.push("No widget activity in the last 30 days.");
  }
  return { health, reasons };
}

function mapTicket(row: Row, organizationNames: Map<string, string>): AdminTicketSummary {
  const organizationId = text(row.organization_id);
  return {
    id: text(row.id),
    ticketNumber: numberValue(row.ticket_number),
    organizationId,
    organizationName: organizationNames.get(organizationId) ?? "Unknown client",
    createdBy: optionalText(row.created_by),
    subject: text(row.subject),
    category: ticketCategory(row.category),
    priority: ticketPriority(row.priority),
    status: ticketStatus(row.status),
    assignedTo: optionalText(row.assigned_to),
    createdAt: text(row.created_at),
    updatedAt: text(row.updated_at),
    resolvedAt: optionalText(row.resolved_at),
  };
}

async function organizationNameMap(client: ReturnType<typeof createSupabaseAdminClient>, ids: string[]) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return new Map<string, string>();
  const { data, error } = await client.from("organizations").select("id,name").in("id", unique);
  throwIf(error, "ticket organizations");
  return new Map(rows(data).map((entry) => [text(entry.id), text(entry.name)]));
}

async function loadAdminClients(client: ReturnType<typeof createSupabaseAdminClient>): Promise<AdminClientSummary[]> {
  const since30d = daysAgo(30);
  const { data: organizationsData, error: organizationsError } = await client
    .from("organizations")
    .select("id,name,slug,created_at")
    .order("created_at", { ascending: false })
    .limit(CLIENT_LIST_LIMIT);
  throwIf(organizationsError, "admin clients");
  const organizations = rows(organizationsData);
  const ids = organizations.map((entry) => text(entry.id)).filter(Boolean);
  if (ids.length === 0) return [];

  const [profilesResult, widgetsResult, subscriptionsResult, membersResult, websitesResult, eventScan, leadsScan] = await Promise.all([
    client.from("coach_profiles").select("organization_id,name,email,website").in("organization_id", ids),
    client.from("widgets").select("id,organization_id,public_id,status,allowed_origins").in("organization_id", ids),
    client.from("subscriptions").select("organization_id,plan,status,current_period_end").in("organization_id", ids),
    client.from("organization_members").select("organization_id,user_id").in("organization_id", ids),
    client.from("websites").select("organization_id,url,scan_status,error").in("organization_id", ids),
    scanRows((from, to) => client.from("widget_events").select("organization_id,widget_id,event_name,session_id,occurred_at").in("organization_id", ids).gte("occurred_at", since30d).order("occurred_at", { ascending: false }).range(from, to)),
    scanRows((from, to) => client.from("leads").select("organization_id,created_at").in("organization_id", ids).gte("created_at", since30d).order("created_at", { ascending: false }).range(from, to)),
  ]);
  throwIf(profilesResult.error, "admin client profiles");
  throwIf(widgetsResult.error, "admin client widgets");
  throwIf(subscriptionsResult.error, "admin client subscriptions");
  throwIf(membersResult.error, "admin client members");
  throwIf(websitesResult.error, "admin client websites");

  const profiles = rows(profilesResult.data);
  const widgets = rows(widgetsResult.data);
  const subscriptions = rows(subscriptionsResult.data);
  const members = rows(membersResult.data);
  const websites = rows(websitesResult.data);

  return organizations.map((organization) => {
    const organizationId = text(organization.id);
    const profile = profiles.find((entry) => text(entry.organization_id) === organizationId);
    const widget = widgets.find((entry) => text(entry.organization_id) === organizationId);
    const subscription = subscriptions.find((entry) => text(entry.organization_id) === organizationId);
    const website = websites.find((entry) => text(entry.organization_id) === organizationId);
    const events = eventScan.rows.filter((entry) => text(entry.organization_id) === organizationId);
    const widgetSessions = new Set(events.filter((entry) => entry.event_name === "widget_view").map((entry) => `${text(entry.widget_id)}:${text(entry.session_id)}`));
    const conversations = events.filter((entry) => entry.event_name === "conversation_started").length;
    const bookingClicks = events.filter((entry) => entry.event_name === "booking_clicked").length;
    const leads = leadsScan.rows.filter((entry) => text(entry.organization_id) === organizationId).length;
    const lastWidgetActivityAt = optionalText(events[0]?.occurred_at);
    const plan = planValue(subscription?.plan);
    const subscriptionStatus = subscriptionStatusValue(subscription?.status);
    const rawWidgetStatus = text(widget?.status);
    const widgetStatus: AdminClientSummary["widgetStatus"] = ["draft", "active", "disabled"].includes(rawWidgetStatus)
      ? (rawWidgetStatus as "draft" | "active" | "disabled")
      : "missing";
    const rawScanStatus = text(website?.scan_status);
    const scanStatus: AdminClientSummary["scanStatus"] = ["never", "scanning", "scanned", "error"].includes(rawScanStatus)
      ? (rawScanStatus as AdminClientSummary["scanStatus"])
      : "never";
    const health = healthFor({ subscriptionStatus, widgetStatus, scanStatus, lastWidgetActivityAt });
    return {
      organizationId,
      name: text(organization.name),
      slug: text(organization.slug),
      createdAt: text(organization.created_at),
      contactName: optionalText(profile?.name),
      contactEmail: optionalText(profile?.email),
      websiteUrl: optionalText(website?.url) ?? optionalText(profile?.website),
      memberCount: members.filter((entry) => text(entry.organization_id) === organizationId).length,
      plan,
      subscriptionStatus,
      currentPeriodEnd: optionalText(subscription?.current_period_end),
      widgetId: optionalText(widget?.id),
      widgetPublicId: optionalText(widget?.public_id),
      widgetStatus,
      allowedOrigins: stringArray(widget?.allowed_origins),
      scanStatus,
      scanError: optionalText(website?.error),
      widgetSessions30d: widgetSessions.size,
      conversations30d: conversations,
      leads30d: leads,
      bookingClicks30d: bookingClicks,
      lastWidgetActivityAt,
      usageLimit: conversationLimit(plan),
      health: health.health,
      healthReasons: health.reasons,
    } satisfies AdminClientSummary;
  });
}

function healthAlerts(clients: AdminClientSummary[]) {
  const alerts: AdminHealthAlert[] = [];
  for (const client of clients) {
    for (const [index, message] of client.healthReasons.entries()) {
      const lower = message.toLowerCase();
      const kind: AdminHealthAlert["kind"] = lower.includes("subscription")
        ? "billing"
        : lower.includes("scan")
          ? "knowledge"
          : lower.includes("activity")
            ? "inactivity"
            : "widget";
      alerts.push({
        id: `${client.organizationId}:${kind}:${index}`,
        organizationId: client.organizationId,
        organizationName: client.name,
        severity: client.health === "critical" ? "critical" : kind === "inactivity" ? "info" : "warning",
        kind,
        message,
      });
    }
  }
  const severity = { critical: 0, warning: 1, info: 2 } as const;
  return alerts.sort((a, b) => severity[a.severity] - severity[b.severity]).slice(0, 20);
}

export async function getAdminOverview(): Promise<AdminOverview> {
  await requireAdminActor();
  const client = createSupabaseAdminClient();
  const since7d = daysAgo(7);
  const since30d = daysAgo(30);

  const [
    clientCount,
    newClientCount,
    pageViewCount,
    conversationCount,
    leadCount,
    bookingClickCount,
    openTicketCount,
    memberScan,
    subscriptionScan,
    siteEventScan,
    widgetEventScan,
    clients,
  ] = await Promise.all([
    client.from("organizations").select("id", { count: "exact", head: true }),
    client.from("organizations").select("id", { count: "exact", head: true }).gte("created_at", since30d),
    client.from("platform_events").select("id", { count: "exact", head: true }).eq("event_name", "page_view").gte("occurred_at", since30d),
    client.from("widget_events").select("id", { count: "exact", head: true }).eq("event_name", "conversation_started").gte("occurred_at", since30d),
    client.from("leads").select("id", { count: "exact", head: true }).gte("created_at", since30d),
    client.from("widget_events").select("id", { count: "exact", head: true }).eq("event_name", "booking_clicked").gte("occurred_at", since30d),
    client.from("support_tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress", "waiting_on_customer"]),
    scanRows((from, to) => client.from("organization_members").select("user_id").order("created_at", { ascending: false }).range(from, to), 10_000),
    scanRows((from, to) => client.from("subscriptions").select("plan,status").order("created_at", { ascending: false }).range(from, to), 10_000),
    scanRows((from, to) => client.from("platform_events").select("visitor_id,occurred_at").eq("event_name", "page_view").gte("occurred_at", since30d).order("occurred_at", { ascending: false }).range(from, to)),
    scanRows((from, to) => client.from("widget_events").select("widget_id,session_id").eq("event_name", "widget_view").gte("occurred_at", since30d).order("occurred_at", { ascending: false }).range(from, to)),
    loadAdminClients(client),
  ]);

  for (const [result, context] of [
    [clientCount, "client count"],
    [newClientCount, "new client count"],
    [pageViewCount, "page view count"],
    [conversationCount, "conversation count"],
    [leadCount, "lead count"],
    [bookingClickCount, "booking click count"],
    [openTicketCount, "open ticket count"],
  ] as const) throwIf(result.error, context);

  const planDistribution: Record<AdminSubscriptionPlan, number> = { free: 0, solo: 0, pro: 0, academy: 0 };
  const subscriptionDistribution: Record<AdminSubscriptionStatus, number> = { free: 0, active: 0, trialing: 0, past_due: 0, canceled: 0 };
  for (const subscription of subscriptionScan.rows) {
    planDistribution[planValue(subscription.plan)] += 1;
    subscriptionDistribution[subscriptionStatusValue(subscription.status)] += 1;
  }

  const siteSessions30d = new Set(siteEventScan.rows.map((entry) => text(entry.visitor_id))).size;
  const siteSessions7d = new Set(
    siteEventScan.rows.filter((entry) => text(entry.occurred_at) >= since7d).map((entry) => text(entry.visitor_id)),
  ).size;
  const widgetSessions30d = new Set(widgetEventScan.rows.map((entry) => `${text(entry.widget_id)}:${text(entry.session_id)}`)).size;

  return {
    siteSessions7d,
    siteSessions30d,
    pageViews30d: pageViewCount.count ?? 0,
    clients: clientCount.count ?? 0,
    users: new Set(memberScan.rows.map((entry) => text(entry.user_id)).filter(Boolean)).size,
    newClients30d: newClientCount.count ?? 0,
    widgetSessions30d,
    conversations30d: conversationCount.count ?? 0,
    leads30d: leadCount.count ?? 0,
    bookingClicks30d: bookingClickCount.count ?? 0,
    openTickets: openTicketCount.count ?? 0,
    planDistribution,
    subscriptionDistribution,
    healthAlerts: healthAlerts(clients),
    recentClients: clients.slice(0, 8),
    metricsTruncated: memberScan.truncated || subscriptionScan.truncated || siteEventScan.truncated || widgetEventScan.truncated,
    generatedAt: new Date().toISOString(),
  };
}

export async function getAdminClients(): Promise<AdminClientSummary[]> {
  await requireAdminActor();
  return loadAdminClients(createSupabaseAdminClient());
}

export async function getAdminClientDetail(organizationId: string): Promise<AdminClientDetail | null> {
  await requireAdminActor();
  if (!validUuid(organizationId)) return null;
  const client = createSupabaseAdminClient();
  const monthStart = startOfUtcMonth();
  const since30d = daysAgo(30);
  const { data: organizationData, error: organizationError } = await client.from("organizations").select("id,name,slug,created_at").eq("id", organizationId).maybeSingle();
  throwIf(organizationError, "admin client detail");
  const organization = record(organizationData);
  if (!organization) return null;

  const [profileResult, widgetResult, subscriptionResult, memberResult, websiteResult, knowledgeResult, eventResult, conversationResult, ticketResult, monthlyEventScan, monthlyLeadCount, totalConversationCount, totalLeadCount, totalEventCount] = await Promise.all([
    client.from("coach_profiles").select("name,email,website").eq("organization_id", organizationId).limit(1).maybeSingle(),
    client.from("widgets").select("id,public_id,status,allowed_origins").eq("organization_id", organizationId).limit(1).maybeSingle(),
    client.from("subscriptions").select("plan,status,stripe_customer_id,stripe_subscription_id,current_period_end").eq("organization_id", organizationId).maybeSingle(),
    client.from("organization_members").select("user_id,role,created_at").eq("organization_id", organizationId).order("created_at").limit(50),
    client.from("websites").select("url,scan_status,error").eq("organization_id", organizationId).maybeSingle(),
    client.from("knowledge_sources").select("id,title,type,error,updated_at").eq("organization_id", organizationId).not("error", "is", null).order("updated_at", { ascending: false }).limit(20),
    client.from("widget_events").select("id,event_name,session_id,occurred_at").eq("organization_id", organizationId).order("occurred_at", { ascending: false }).limit(50),
    client.from("conversations").select("id,intent_level,preview,started_at,last_message_at").eq("organization_id", organizationId).order("last_message_at", { ascending: false }).limit(20),
    client.from("support_tickets").select("*").eq("organization_id", organizationId).order("updated_at", { ascending: false }).limit(20),
    scanRows((from, to) => client.from("widget_events").select("widget_id,event_name,session_id,occurred_at").eq("organization_id", organizationId).gte("occurred_at", since30d).order("occurred_at", { ascending: false }).range(from, to), 10_000),
    client.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).gte("created_at", monthStart),
    client.from("conversations").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    client.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    client.from("widget_events").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
  ]);
  for (const [result, context] of [
    [profileResult, "client profile"], [widgetResult, "client widget"], [subscriptionResult, "client subscription"],
    [memberResult, "client members"], [websiteResult, "client website"], [knowledgeResult, "client knowledge errors"],
    [eventResult, "client events"], [conversationResult, "client conversations"], [ticketResult, "client tickets"],
    [monthlyLeadCount, "client monthly leads"], [totalConversationCount, "client conversation total"],
    [totalLeadCount, "client lead total"], [totalEventCount, "client event total"],
  ] as const) throwIf(result.error, context);

  const profile = record(profileResult.data);
  const widget = record(widgetResult.data);
  const subscription = record(subscriptionResult.data);
  const website = record(websiteResult.data);
  const memberRows = rows(memberResult.data);
  const userResults = await Promise.all(memberRows.map((entry) => client.auth.admin.getUserById(text(entry.user_id))));
  const members: AdminMember[] = memberRows.map((entry, index) => {
    const user = userResults[index]?.data.user;
    const rawRole = text(entry.role);
    return {
      userId: text(entry.user_id),
      role: ["owner", "admin", "member"].includes(rawRole) ? (rawRole as AdminMember["role"]) : "member",
      email: user?.email,
      name: optionalText(user?.user_metadata?.full_name),
      joinedAt: text(entry.created_at),
      lastSignInAt: user?.last_sign_in_at,
    };
  });
  const events30d = monthlyEventScan.rows;
  const monthEvents = events30d.filter((entry) => text(entry.occurred_at) >= monthStart);
  const monthlyConversations = new Set(
    monthEvents.filter((entry) => entry.event_name === "conversation_started").map((entry) => `${text(entry.widget_id)}:${text(entry.session_id)}`),
  ).size;
  const plan = planValue(subscription?.plan);
  const limit = conversationLimit(plan);
  const subscriptionStatus = subscriptionStatusValue(subscription?.status);
  const rawWidgetStatus = text(widget?.status);
  const widgetStatus: AdminClientSummary["widgetStatus"] = ["draft", "active", "disabled"].includes(rawWidgetStatus)
    ? (rawWidgetStatus as "draft" | "active" | "disabled")
    : "missing";
  const rawScanStatus = text(website?.scan_status);
  const scanStatus: AdminClientSummary["scanStatus"] = ["never", "scanning", "scanned", "error"].includes(rawScanStatus)
    ? (rawScanStatus as AdminClientSummary["scanStatus"])
    : "never";
  const lastWidgetActivityAt = optionalText(events30d[0]?.occurred_at);
  const health = healthFor({ subscriptionStatus, widgetStatus, scanStatus, lastWidgetActivityAt });
  const organizationNames = new Map([[organizationId, text(organization.name)]]);
  const tickets = rows(ticketResult.data).map((entry) => mapTicket(entry, organizationNames));

  const summary: AdminClientSummary = {
    organizationId,
    name: text(organization.name),
    slug: text(organization.slug),
    createdAt: text(organization.created_at),
    contactName: optionalText(profile?.name),
    contactEmail: optionalText(profile?.email),
    websiteUrl: optionalText(website?.url) ?? optionalText(profile?.website),
    memberCount: members.length,
    plan,
    subscriptionStatus,
    currentPeriodEnd: optionalText(subscription?.current_period_end),
    widgetId: optionalText(widget?.id),
    widgetPublicId: optionalText(widget?.public_id),
    widgetStatus,
    allowedOrigins: stringArray(widget?.allowed_origins),
    scanStatus,
    scanError: optionalText(website?.error),
    widgetSessions30d: new Set(events30d.filter((entry) => entry.event_name === "widget_view").map((entry) => `${text(entry.widget_id)}:${text(entry.session_id)}`)).size,
    conversations30d: events30d.filter((entry) => entry.event_name === "conversation_started").length,
    leads30d: 0,
    bookingClicks30d: events30d.filter((entry) => entry.event_name === "booking_clicked").length,
    lastWidgetActivityAt,
    usageLimit: limit,
    health: health.health,
    healthReasons: health.reasons,
  };
  const leads30dResult = await client.from("leads").select("id", { count: "exact", head: true }).eq("organization_id", organizationId).gte("created_at", since30d);
  throwIf(leads30dResult.error, "client leads 30d");
  summary.leads30d = leads30dResult.count ?? 0;

  return {
    ...summary,
    members,
    stripeCustomerId: optionalText(subscription?.stripe_customer_id),
    stripeSubscriptionId: optionalText(subscription?.stripe_subscription_id),
    monthlyUsage: {
      conversations: monthlyConversations,
      conversationLimit: limit,
      leads: monthlyLeadCount.count ?? 0,
      usagePercent: limit > 0 ? Math.min(Math.round((monthlyConversations / limit) * 100), 100) : 100,
    },
    totals: {
      conversations: totalConversationCount.count ?? 0,
      leads: totalLeadCount.count ?? 0,
      widgetEvents: totalEventCount.count ?? 0,
      openTickets: tickets.filter((ticket) => !["resolved", "closed"].includes(ticket.status)).length,
    },
    recentEvents: rows(eventResult.data).map((entry) => ({ id: text(entry.id), name: text(entry.event_name), sessionId: text(entry.session_id), occurredAt: text(entry.occurred_at) })),
    recentConversations: rows(conversationResult.data).map((entry) => ({ id: text(entry.id), intentLevel: text(entry.intent_level), preview: entry.preview === true, startedAt: text(entry.started_at), lastMessageAt: text(entry.last_message_at) })),
    knowledgeErrors: rows(knowledgeResult.data).map((entry) => ({ id: text(entry.id), title: text(entry.title), type: text(entry.type), error: text(entry.error), updatedAt: text(entry.updated_at) })),
    tickets,
  };
}

export async function getAdminTickets(): Promise<AdminTicketSummary[]> {
  await requireAdminActor();
  const client = createSupabaseAdminClient();
  const { data, error } = await client.from("support_tickets").select("*").order("updated_at", { ascending: false }).limit(200);
  throwIf(error, "admin tickets");
  const ticketRows = rows(data);
  const names = await organizationNameMap(client, ticketRows.map((entry) => text(entry.organization_id)));
  return ticketRows.map((entry) => mapTicket(entry, names));
}

export async function getAdminTicket(ticketId: string): Promise<AdminTicketDetail | null> {
  await requireAdminActor();
  if (!validUuid(ticketId)) return null;
  const client = createSupabaseAdminClient();
  const [{ data: ticketData, error: ticketError }, { data: messageData, error: messageError }] = await Promise.all([
    client.from("support_tickets").select("*").eq("id", ticketId).maybeSingle(),
    client.from("support_ticket_messages").select("*").eq("ticket_id", ticketId).order("created_at", { ascending: true }).limit(500),
  ]);
  throwIf(ticketError, "admin ticket");
  throwIf(messageError, "admin ticket messages");
  const ticketRow = record(ticketData);
  if (!ticketRow) return null;
  const names = await organizationNameMap(client, [text(ticketRow.organization_id)]);
  const ticket = mapTicket(ticketRow, names);
  const userIds = [...new Set([ticket.createdBy, ticket.assignedTo, ...rows(messageData).map((entry) => optionalText(entry.sender_user_id))].filter((value): value is string => Boolean(value)))];
  const userResults = await Promise.all(userIds.map((id) => client.auth.admin.getUserById(id)));
  const emails = new Map(userIds.map((id, index) => [id, userResults[index]?.data.user?.email]));
  return {
    ...ticket,
    createdByEmail: ticket.createdBy ? emails.get(ticket.createdBy) : undefined,
    assignedToEmail: ticket.assignedTo ? emails.get(ticket.assignedTo) : undefined,
    messages: rows(messageData).map((entry) => ({
      id: text(entry.id),
      ticketId: text(entry.ticket_id),
      senderUserId: optionalText(entry.sender_user_id),
      senderType: ["customer", "admin", "system"].includes(text(entry.sender_type)) ? (text(entry.sender_type) as AdminTicketMessage["senderType"]) : "system",
      senderEmail: optionalText(entry.sender_user_id) ? emails.get(text(entry.sender_user_id)) : undefined,
      body: text(entry.body),
      internal: entry.internal === true,
      createdAt: text(entry.created_at),
    })),
  };
}

export async function updateAdminTicket(
  ticketId: string,
  input: { status?: AdminTicketStatus; priority?: AdminTicketPriority; assignedTo?: string | null },
): Promise<AdminTicketSummary | null> {
  await requireAdminActor();
  if (!validUuid(ticketId)) return null;
  if (input.status && !ADMIN_TICKET_STATUSES.includes(input.status)) throw new Error("Invalid ticket status.");
  if (input.priority && !ADMIN_TICKET_PRIORITIES.includes(input.priority)) throw new Error("Invalid ticket priority.");
  if (typeof input.assignedTo === "string" && !validUuid(input.assignedTo)) throw new Error("Invalid assignee.");

  const patch: Record<string, string | null> = { updated_at: new Date().toISOString() };
  if (input.status) {
    patch.status = input.status;
    patch.resolved_at = ["resolved", "closed"].includes(input.status) ? new Date().toISOString() : null;
  }
  if (input.priority) patch.priority = input.priority;
  if (input.assignedTo !== undefined) patch.assigned_to = input.assignedTo;
  const client = createSupabaseAdminClient();
  const { data, error } = await client.from("support_tickets").update(patch).eq("id", ticketId).select("*").maybeSingle();
  throwIf(error, "update admin ticket");
  const ticketRow = record(data);
  if (!ticketRow) return null;
  const names = await organizationNameMap(client, [text(ticketRow.organization_id)]);
  return mapTicket(ticketRow, names);
}

export async function addAdminTicketMessage(
  ticketId: string,
  input: { body: string; internal?: boolean },
): Promise<AdminTicketMessage | null> {
  const actor = await requireAdminActor();
  if (!validUuid(ticketId)) return null;
  const body = input.body.trim();
  if (body.length < 1 || body.length > 5_000) throw new Error("Ticket messages must be between 1 and 5,000 characters.");
  const client = createSupabaseAdminClient();
  const { data: ticket, error: ticketError } = await client.from("support_tickets").select("id").eq("id", ticketId).maybeSingle();
  throwIf(ticketError, "admin ticket message target");
  if (!ticket) return null;
  const { data, error } = await client
    .from("support_ticket_messages")
    .insert({ ticket_id: ticketId, sender_user_id: actor.id, sender_type: "admin", body, internal: input.internal === true })
    .select("*")
    .single();
  throwIf(error, "add admin ticket message");
  const message = record(data);
  if (!message) return null;
  return {
    id: text(message.id),
    ticketId: text(message.ticket_id),
    senderUserId: optionalText(message.sender_user_id),
    senderType: "admin",
    senderEmail: actor.email,
    body: text(message.body),
    internal: message.internal === true,
    createdAt: text(message.created_at),
  };
}
