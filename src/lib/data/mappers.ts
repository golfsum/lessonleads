import type {
  ChatMessage,
  CoachProfile,
  ContentItem,
  Conversation,
  FaqItem,
  KnowledgeChunk,
  KnowledgeSource,
  Lead,
  LeadActivity,
  LessonWidget,
  Organization,
  PublicWidget,
  Service,
  Subscription,
  SwingUpload,
  UtmValues,
  VisitorProfile,
  WebsiteInfo,
  WidgetEvent,
  WidgetMenuItem,
  WidgetTheme,
  WorkspaceData,
} from "@/lib/domain/types";
import { isPlanId } from "@/lib/billing/plans";
import { defaultMenu, defaultTheme, DEFAULT_NOTIFICATION_PREFS } from "@/lib/domain/defaults";
import { intentLevelForScore } from "@/lib/domain/types";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function asObject<T extends object>(value: unknown, fallback: T): T {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as T) : fallback;
}

export function mapOrganization(row: Record<string, unknown>): Organization {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    createdAt: String(row.created_at),
  };
}

export function mapCoach(row: Record<string, unknown>): CoachProfile {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    name: String(row.name),
    businessName: String(row.business_name),
    email: String(row.email),
    phone: row.phone ? String(row.phone) : undefined,
    website: row.website ? String(row.website) : undefined,
    location: String(row.location ?? ""),
    timezone: String(row.timezone ?? "America/Phoenix"),
    title: String(row.title ?? "Golf Instructor"),
    credentials: asStringArray(row.credentials),
    bio: String(row.bio ?? ""),
    philosophy: String(row.philosophy ?? ""),
    teachingFocus: asStringArray(row.teaching_focus),
    socialLinks: asObject(row.social_links, {}),
    bookingProvider: (row.booking_provider as CoachProfile["bookingProvider"]) || "none",
    bookingUrl: String(row.booking_url ?? ""),
    profilePhotoUrl: row.profile_photo_url ? String(row.profile_photo_url) : undefined,
    notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS, ...asObject(row.notification_prefs, {}) },
  };
}

export function mapWebsite(row: Record<string, unknown> | null): WebsiteInfo {
  if (!row) return { scanStatus: "never", pagesFound: 0 };
  return {
    url: row.url ? String(row.url) : undefined,
    scanStatus: (row.scan_status as WebsiteInfo["scanStatus"]) ?? "never",
    lastScanAt: row.last_scan_at ? String(row.last_scan_at) : undefined,
    pagesFound: Number(row.pages_found ?? 0),
    error: row.error ? String(row.error) : undefined,
  };
}

export function mapService(row: Record<string, unknown>): Service {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    coachId: String(row.coach_id),
    name: String(row.name),
    slug: String(row.slug),
    description: String(row.description ?? ""),
    priceCents: row.price_cents === null || row.price_cents === undefined ? null : Number(row.price_cents),
    priceLabel: row.price_label ? String(row.price_label) : undefined,
    durationMinutes: row.duration_minutes === null || row.duration_minutes === undefined ? null : Number(row.duration_minutes),
    mode: (row.mode as Service["mode"]) || "in_person",
    location: row.location ? String(row.location) : undefined,
    imageUrl: row.image_url ? String(row.image_url) : undefined,
    bookingUrl: row.booking_url ? String(row.booking_url) : undefined,
    ctaLabel: row.cta_label ? String(row.cta_label) : undefined,
    featured: Boolean(row.featured),
    bestFor: asStringArray(row.best_for),
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

export function mapTheme(raw: unknown, firstName = "Coach"): WidgetTheme {
  const theme = { ...defaultTheme(firstName), ...asObject<Partial<WidgetTheme>>(raw, {}) };
  if (theme.launcherStyle !== "icon" && theme.launcherStyle !== "icon_text" && theme.launcherStyle !== "text") {
    theme.launcherStyle = "icon_text";
  }
  return theme;
}

export function mapMenu(raw: unknown, firstName = "Coach"): WidgetMenuItem[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaultMenu(firstName);
  return raw as WidgetMenuItem[];
}

export function mapWidget(row: Record<string, unknown>, firstName = "Coach"): LessonWidget {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    coachId: String(row.coach_id),
    publicId: String(row.public_id),
    slug: String(row.slug),
    name: String(row.name),
    status: row.status as LessonWidget["status"],
    allowedOrigins: asStringArray(row.allowed_origins),
    theme: mapTheme(row.theme, firstName),
    menu: mapMenu(row.menu, firstName),
    defaultSectionKey: (row.default_section_key as LessonWidget["defaultSectionKey"]) || "ask",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapSource(row: Record<string, unknown>): KnowledgeSource {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    coachId: String(row.coach_id),
    type: row.type as KnowledgeSource["type"],
    title: String(row.title),
    url: row.url ? String(row.url) : undefined,
    status: row.status as KnowledgeSource["status"],
    includeInAi: Boolean(row.include_in_ai),
    lastSyncedAt: row.last_synced_at ? String(row.last_synced_at) : undefined,
    error: row.error ? String(row.error) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapChunk(row: Record<string, unknown>): KnowledgeChunk {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    coachId: String(row.coach_id),
    sourceId: String(row.source_id),
    sourceType: row.source_type as KnowledgeChunk["sourceType"],
    title: String(row.title),
    url: row.url ? String(row.url) : undefined,
    category: row.category ? String(row.category) : undefined,
    content: String(row.content),
    position: Number(row.position ?? 0),
    updatedAt: String(row.updated_at),
  };
}

export function mapFaq(row: Record<string, unknown>): FaqItem {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    sourceId: row.source_id ? String(row.source_id) : undefined,
    question: String(row.question),
    answer: String(row.answer),
    enabled: Boolean(row.enabled),
    sortOrder: Number(row.sort_order ?? 0),
  };
}

export function mapContent(row: Record<string, unknown>): ContentItem {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    coachId: String(row.coach_id),
    type: row.type as ContentItem["type"],
    title: String(row.title),
    description: row.description ? String(row.description) : undefined,
    url: String(row.url),
    thumbnailUrl: row.thumbnail_url ? String(row.thumbnail_url) : undefined,
    categories: asStringArray(row.categories),
    transcriptAvailable: Boolean(row.transcript_available),
    includeInAi: Boolean(row.include_in_ai),
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: String(row.created_at),
  };
}

export function mapConversation(row: Record<string, unknown>): Conversation {
  const messages = Array.isArray(row.messages) ? (row.messages as ChatMessage[]) : [];
  const profile = asObject<VisitorProfile>(row.profile, {});
  const score = Number(row.intent_score ?? 0);
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    widgetId: String(row.widget_id),
    visitorId: String(row.visitor_id),
    sessionId: String(row.session_id),
    leadId: row.lead_id ? String(row.lead_id) : undefined,
    messages,
    profile,
    intentScore: score,
    intentLevel: (row.intent_level as Conversation["intentLevel"]) || intentLevelForScore(score),
    recommendedServiceId: row.recommended_service_id ? String(row.recommended_service_id) : undefined,
    summary: row.summary ? String(row.summary) : undefined,
    page: row.page ? String(row.page) : undefined,
    referrer: row.referrer ? String(row.referrer) : undefined,
    utm: row.utm ? asObject<UtmValues>(row.utm, {}) : undefined,
    device: row.device === "mobile" || row.device === "desktop" ? row.device : undefined,
    preview: row.preview === true,
    startedAt: String(row.started_at),
    lastMessageAt: String(row.last_message_at),
  };
}

export function mapLead(row: Record<string, unknown>): Lead {
  const score = Number(row.intent_score ?? 0);
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    widgetId: String(row.widget_id),
    conversationId: row.conversation_id ? String(row.conversation_id) : undefined,
    visitorId: String(row.visitor_id),
    firstName: String(row.first_name),
    lastName: row.last_name ? String(row.last_name) : undefined,
    email: String(row.email),
    phone: row.phone ? String(row.phone) : undefined,
    consent: Boolean(row.consent),
    smsConsent: Boolean(row.sms_consent),
    preferredContact: row.preferred_contact === "phone" ? "phone" : row.preferred_contact === "email" ? "email" : undefined,
    status: row.status as Lead["status"],
    intentScore: score,
    intentLevel: (row.intent_level as Lead["intentLevel"]) || intentLevelForScore(score),
    interest: row.interest ? String(row.interest) : undefined,
    source: row.source as Lead["source"],
    sessionId: String(row.session_id),
    idempotencyKey: String(row.idempotency_key),
    bookingToken: String(row.booking_token_hash),
    bookingClickedAt: row.booking_clicked_at ? String(row.booking_clicked_at) : undefined,
    recommendedServiceId: row.recommended_service_id ? String(row.recommended_service_id) : undefined,
    summary: row.summary ? String(row.summary) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    landingPage: row.landing_page ? String(row.landing_page) : undefined,
    referrer: row.referrer ? String(row.referrer) : undefined,
    utm: row.utm ? asObject<UtmValues>(row.utm, {}) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    activity: Array.isArray(row.activity) ? (row.activity as LeadActivity[]) : [],
  };
}

export function mapUpload(row: Record<string, unknown>): SwingUpload {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    widgetId: String(row.widget_id),
    conversationId: row.conversation_id ? String(row.conversation_id) : undefined,
    leadId: row.lead_id ? String(row.lead_id) : undefined,
    visitorId: String(row.visitor_id),
    fileName: String(row.file_name),
    filePath: String(row.file_path),
    mimeType: String(row.mime_type),
    sizeBytes: Number(row.size_bytes),
    club: row.club ? String(row.club) : undefined,
    typicalMiss: row.typical_miss ? String(row.typical_miss) : undefined,
    handicap: row.handicap ? String(row.handicap) : undefined,
    goal: row.goal ? String(row.goal) : undefined,
    createdAt: String(row.created_at),
  };
}

export function mapEvent(row: Record<string, unknown>): WidgetEvent {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    widgetId: String(row.widget_id),
    leadId: row.lead_id ? String(row.lead_id) : undefined,
    conversationId: row.conversation_id ? String(row.conversation_id) : undefined,
    name: row.event_name as WidgetEvent["name"],
    sessionId: String(row.session_id),
    occurredAt: String(row.occurred_at),
    properties: row.properties as WidgetEvent["properties"],
  };
}

export function mapSubscription(row: Record<string, unknown> | null, organizationId: string): Subscription {
  if (!row) return { organizationId, plan: "free", status: "free" };
  return {
    organizationId: String(row.organization_id),
    plan: isPlanId(String(row.plan)) ? String(row.plan) as Subscription["plan"] : "free",
    status: row.status as Subscription["status"],
    stripeCustomerId: row.stripe_customer_id ? String(row.stripe_customer_id) : undefined,
    stripeSubscriptionId: row.stripe_subscription_id ? String(row.stripe_subscription_id) : undefined,
    currentPeriodEnd: row.current_period_end ? String(row.current_period_end) : undefined,
  };
}

export function toPublicWidget(data: WorkspaceData): PublicWidget {
  const { widget, coach } = data;
  return {
    widget: {
      id: widget.id,
      publicId: widget.publicId,
      slug: widget.slug,
      status: widget.status,
      theme: widget.theme,
      menu: widget.menu,
      defaultSectionKey: widget.defaultSectionKey,
      allowedOrigins: widget.allowedOrigins,
    },
    coach: {
      name: coach.name,
      businessName: coach.businessName,
      location: coach.location,
      title: coach.title,
      credentials: coach.credentials,
      bio: coach.bio,
      philosophy: coach.philosophy,
      teachingFocus: coach.teachingFocus,
      socialLinks: coach.socialLinks,
      bookingProvider: coach.bookingProvider,
      bookingUrl: coach.bookingUrl,
      profilePhotoUrl: coach.profilePhotoUrl,
      website: coach.website,
      email: coach.email.trim() || undefined,
    },
    services: data.services.filter((service) => service.active).sort((a, b) => a.sortOrder - b.sortOrder),
    contentItems: data.contentItems.filter((item) => item.active).sort((a, b) => a.sortOrder - b.sortOrder),
    faqs: data.faqs.filter((faq) => faq.enabled).sort((a, b) => a.sortOrder - b.sortOrder),
    plan: data.subscription.plan,
    demo: data.demo,
  };
}
