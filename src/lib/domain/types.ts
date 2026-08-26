export type Plan = "free" | "solo" | "pro";

export type LeadStatus = "new" | "contacted" | "qualified" | "booking_sent" | "booked" | "won" | "lost";

export type IntentLevel = "low" | "medium" | "high";

export type BookingProvider =
  | "coachnow"
  | "golf_genius"
  | "calendly"
  | "acuity"
  | "square"
  | "mindbody"
  | "custom"
  | "none";

export type WidgetEventName =
  | "widget_view"
  | "widget_open"
  | "conversation_started"
  | "message_sent"
  | "video_viewed"
  | "service_viewed"
  | "lead_capture_started"
  | "lead_captured"
  | "swing_upload_started"
  | "swing_uploaded"
  | "booking_clicked"
  | "contact_clicked";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
}

export interface SocialLinks {
  instagram?: string;
  youtube?: string;
  facebook?: string;
  x?: string;
  tiktok?: string;
}

export interface NotificationPrefs {
  newLead: boolean;
  highIntentLead: boolean;
  swingUpload: boolean;
  bookingClick: boolean;
  everyConversation: boolean;
}

export interface CoachProfile {
  id: string;
  organizationId: string;
  name: string;
  businessName: string;
  email: string;
  phone?: string;
  website?: string;
  location: string;
  timezone: string;
  title: string;
  credentials: string[];
  bio: string;
  philosophy: string;
  teachingFocus: string[];
  socialLinks: SocialLinks;
  bookingProvider: BookingProvider;
  bookingUrl: string;
  profilePhotoUrl?: string;
  notificationPrefs: NotificationPrefs;
}

export type ServiceMode = "in_person" | "online" | "both";

export interface Service {
  id: string;
  organizationId: string;
  coachId: string;
  name: string;
  slug: string;
  description: string;
  priceCents: number | null;
  priceLabel?: string;
  durationMinutes: number | null;
  mode: ServiceMode;
  location?: string;
  imageUrl?: string;
  bookingUrl?: string;
  ctaLabel?: string;
  featured: boolean;
  bestFor: string[];
  active: boolean;
  sortOrder: number;
}

export type WidgetSectionKey =
  | "ask"
  | "lessons"
  | "videos"
  | "coach"
  | "drills"
  | "resources"
  | "faq"
  | "swing"
  | "contact"
  | "custom";

export type WidgetMenuIcon =
  | "chat"
  | "flag"
  | "video"
  | "person"
  | "target"
  | "book"
  | "question"
  | "upload"
  | "mail"
  | "link";

export interface WidgetMenuItem {
  id: string;
  key: WidgetSectionKey;
  title: string;
  icon: WidgetMenuIcon;
  enabled: boolean;
  sortOrder: number;
  ctaLabel?: string;
  /** Custom items can point at an external URL instead of internal widget content. */
  externalUrl?: string;
}

export type LauncherIcon = "chat" | "flag" | "golf" | "help";

export interface WidgetTheme {
  assistantName: string;
  welcomeMessage: string;
  launcherText: string;
  launcherIcon: LauncherIcon;
  position: "bottom_right" | "bottom_left";
  size?: "compact" | "standard" | "large";
  primaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  buttonColor: string;
  borderRadius: number;
  appearance: "light" | "dark";
  logoUrl?: string;
  coachAvatarUrl?: string;
  assistantAvatarUrl?: string;
  suggestedQuestions: string[];
}

export interface LessonWidget {
  id: string;
  organizationId: string;
  coachId: string;
  /** Short public token used by the embed script (`data-coach`). */
  publicId: string;
  /** URL slug for the hosted widget page (`/l/[slug]`). */
  slug: string;
  name: string;
  status: "draft" | "active" | "disabled";
  allowedOrigins: string[];
  theme: WidgetTheme;
  menu: WidgetMenuItem[];
  defaultSectionKey: WidgetSectionKey;
  createdAt: string;
  updatedAt: string;
}

export type KnowledgeSourceType = "website_page" | "youtube_video" | "faq" | "document" | "manual";

export type KnowledgeSourceStatus = "pending" | "synced" | "error" | "disabled";

export interface KnowledgeSource {
  id: string;
  organizationId: string;
  coachId: string;
  type: KnowledgeSourceType;
  title: string;
  url?: string;
  status: KnowledgeSourceStatus;
  includeInAi: boolean;
  lastSyncedAt?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeChunk {
  id: string;
  organizationId: string;
  coachId: string;
  sourceId: string;
  sourceType: KnowledgeSourceType;
  title: string;
  url?: string;
  category?: string;
  content: string;
  position: number;
  updatedAt: string;
}

export interface FaqItem {
  id: string;
  organizationId: string;
  sourceId?: string;
  question: string;
  answer: string;
  enabled: boolean;
  sortOrder: number;
}

export type ContentType = "youtube" | "vimeo" | "video" | "article" | "pdf" | "drill" | "guide";

export interface ContentItem {
  id: string;
  organizationId: string;
  coachId: string;
  type: ContentType;
  title: string;
  description?: string;
  url: string;
  thumbnailUrl?: string;
  categories: string[];
  transcriptAvailable: boolean;
  includeInAi: boolean;
  active: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface UtmValues {
  source?: string;
  medium?: string;
  campaign?: string;
}

export interface VisitorProfile {
  experienceLevel?: string;
  handicap?: string;
  primaryIssue?: string;
  focusArea?: string;
  goals?: string;
  playFrequency?: string;
  isLocal?: boolean;
  coachingPreference?: "online" | "in_person";
  urgency?: string;
}

export interface AnswerSource {
  sourceId: string;
  title: string;
  type: KnowledgeSourceType;
}

export type MessageCard =
  | { kind: "video"; contentId: string; title: string; url: string; thumbnailUrl?: string }
  | { kind: "service"; serviceId: string }
  | { kind: "capture"; prompt: string }
  | { kind: "swing_upload"; prompt: string }
  | { kind: "booking"; serviceId?: string; label: string }
  | { kind: "contact"; label: string };

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: "visitor" | "assistant";
  content: string;
  cards?: MessageCard[];
  sources?: AnswerSource[];
  suggestedReplies?: string[];
  createdAt: string;
}

export interface Conversation {
  id: string;
  organizationId: string;
  widgetId: string;
  visitorId: string;
  sessionId: string;
  leadId?: string;
  messages: ChatMessage[];
  profile: VisitorProfile;
  intentScore: number;
  intentLevel: IntentLevel;
  recommendedServiceId?: string;
  summary?: string;
  page?: string;
  referrer?: string;
  utm?: UtmValues;
  device?: "mobile" | "desktop";
  preview?: boolean;
  startedAt: string;
  lastMessageAt: string;
}

export interface LeadActivity {
  id: string;
  type:
    | "conversation"
    | "lead_captured"
    | "swing_uploaded"
    | "booking_clicked"
    | "status_changed"
    | "email_sent"
    | "email_failed"
    | "note_added";
  label: string;
  occurredAt: string;
}

export interface Lead {
  id: string;
  organizationId: string;
  widgetId: string;
  conversationId?: string;
  visitorId: string;
  firstName: string;
  lastName?: string;
  email: string;
  phone?: string;
  consent: boolean;
  smsConsent: boolean;
  preferredContact?: "email" | "phone";
  status: LeadStatus;
  intentScore: number;
  intentLevel: IntentLevel;
  interest?: string;
  source: "hosted" | "inline" | "floating" | "homepage_demo";
  sessionId: string;
  idempotencyKey: string;
  bookingToken: string;
  bookingClickedAt?: string;
  recommendedServiceId?: string;
  summary?: string;
  notes?: string;
  landingPage?: string;
  referrer?: string;
  utm?: UtmValues;
  createdAt: string;
  updatedAt: string;
  activity: LeadActivity[];
}

export interface SwingUpload {
  id: string;
  organizationId: string;
  widgetId: string;
  conversationId?: string;
  leadId?: string;
  visitorId: string;
  fileName: string;
  /** Path relative to the upload storage root. */
  filePath: string;
  mimeType: string;
  sizeBytes: number;
  club?: string;
  typicalMiss?: string;
  handicap?: string;
  goal?: string;
  createdAt: string;
}

export interface WidgetEvent {
  id: string;
  organizationId: string;
  widgetId: string;
  leadId?: string;
  conversationId?: string;
  name: WidgetEventName;
  sessionId: string;
  occurredAt: string;
  properties?: Record<string, string | number | boolean | null>;
}

export interface Subscription {
  organizationId: string;
  plan: Plan;
  status: "free" | "active" | "trialing" | "past_due" | "canceled";
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodEnd?: string;
}

export interface WebsiteScanPage {
  url: string;
  title: string;
  included: boolean;
}

export interface WebsiteInfo {
  url?: string;
  scanStatus: "never" | "scanning" | "scanned" | "error";
  lastScanAt?: string;
  pagesFound: number;
  error?: string;
}

export interface WorkspaceData {
  organization: Organization;
  coach: CoachProfile;
  services: Service[];
  widget: LessonWidget;
  leads: Lead[];
  conversations: Conversation[];
  knowledgeSources: KnowledgeSource[];
  knowledgeChunks: KnowledgeChunk[];
  faqs: FaqItem[];
  contentItems: ContentItem[];
  swingUploads: SwingUpload[];
  events: WidgetEvent[];
  subscription: Subscription;
  website: WebsiteInfo;
  demo: boolean;
}

export interface PublicCoach {
  name: string;
  businessName: string;
  location: string;
  title: string;
  credentials: string[];
  bio: string;
  philosophy: string;
  teachingFocus: string[];
  socialLinks: SocialLinks;
  bookingProvider: BookingProvider;
  bookingUrl: string;
  profilePhotoUrl?: string;
  website?: string;
}

export interface PublicWidget {
  widget: Pick<
    LessonWidget,
    "id" | "publicId" | "slug" | "status" | "theme" | "menu" | "defaultSectionKey" | "allowedOrigins"
  >;
  coach: PublicCoach;
  services: Service[];
  contentItems: ContentItem[];
  faqs: FaqItem[];
  plan: Plan;
  demo: boolean;
}

export interface FunnelStage {
  label: string;
  count: number;
  /** Percentage of the previous stage, 0-100. */
  rateFromPrevious: number | null;
}

export interface AnalyticsSummary {
  widgetViews: number;
  widgetOpens: number;
  conversations: number;
  messages: number;
  leads: number;
  highIntentLeads: number;
  bookingClicks: number;
  swingUploads: number;
  videoViews: number;
  visitorToLeadRate: number;
  leadToBookingClickRate: number;
  funnel: FunnelStage[];
  topServices: Array<{ label: string; count: number; percentage: number }>;
  topTopics: Array<{ label: string; count: number; percentage: number }>;
}

export function intentLevelForScore(score: number): IntentLevel {
  if (score >= 70) return "high";
  if (score >= 31) return "medium";
  return "low";
}
