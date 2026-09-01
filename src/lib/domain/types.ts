export type Plan = "free" | "solo" | "pro" | "academy";

export type OrganizationType =
  | "golf_coach"
  | "golf_academy"
  | "golf_course"
  | "golf_facility"
  | "golf_fitting_studio"
  | "golf_retailer";

export type LeadStatus = "new" | "contacted" | "qualified" | "booking_sent" | "booked" | "won" | "lost";

export type LeadType =
  | "lesson"
  | "membership"
  | "tournament"
  | "corporate_event"
  | "wedding"
  | "group_outing"
  | "junior_program"
  | "fitting"
  | "simulator"
  | "restaurant_event"
  | "general";

export type IntentLevel = "low" | "medium" | "high";

export type KnowledgeCategory =
  | "rates"
  | "policies"
  | "course"
  | "membership"
  | "instruction"
  | "dining"
  | "events"
  | "practice"
  | "general";

export type KnowledgeVolatility = "static" | "frequently_changing";

export type CourseAccessType = "public" | "private" | "resort" | "semi_private";

/** Lesson / service booking tools used by coaches and academies. */
export type BookingProvider =
  | "coachnow"
  | "golf_genius"
  | "calendly"
  | "acuity"
  | "square"
  | "mindbody"
  | "custom"
  | "none";

/** Tee-sheet providers. Architecture support is not the same as a live API. */
export type TeeTimeProviderId =
  | "golfnow"
  | "foreup"
  | "lightspeed"
  | "club_caddie"
  | "chronogolf"
  | "custom_url"
  | "demo"
  | "none";

export type IntegrationStatus = "not_connected" | "pending_access" | "connected" | "error" | "coming_soon";

export type ConversionGoal =
  | "lesson_lead"
  | "lesson_booking"
  | "tee_time_click"
  | "tee_time_booking"
  | "membership_lead"
  | "tournament_lead"
  | "event_lead"
  | "fitting_lead"
  | "service_lead"
  | "custom";

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
  | "contact_clicked"
  | "tee_time_search"
  | "tee_time_result_viewed"
  | "tee_time_booking_clicked";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  courseCount?: number;
  accessType?: CourseAccessType;
  conversionGoals: ConversionGoal[];
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

/**
 * Primary profile for the organization. For a solo coach this is the coach.
 * For a course this is the club contact used for branding and notifications.
 */
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

export interface Location {
  id: string;
  organizationId: string;
  name: string;
  address?: string;
  timezone: string;
  phone?: string;
  website?: string;
  teeTimeProvider: TeeTimeProviderId;
  bookingUrl?: string;
  externalFacilityId?: string;
  latitude?: number;
  longitude?: number;
  sortOrder: number;
}

export interface StaffMember {
  id: string;
  organizationId: string;
  name: string;
  title: string;
  bio: string;
  specialties: string[];
  profilePhotoUrl?: string;
  bookingUrl?: string;
  email?: string;
  sortOrder: number;
  active: boolean;
}

export interface CourseAnnouncement {
  id: string;
  organizationId: string;
  title: string;
  message: string;
  startsAt: string;
  expiresAt?: string;
  priority: number;
  active: boolean;
}

export interface BookingIntegration {
  id: string;
  organizationId: string;
  locationId?: string;
  provider: TeeTimeProviderId;
  status: IntegrationStatus;
  configuration: Record<string, string | number | boolean | null>;
  externalFacilityId?: string;
  supportsSearch: boolean;
  supportsDirectBooking: boolean;
  supportsBookingHandoff: boolean;
  lastSuccessAt?: string;
  lastErrorAt?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export type ServiceMode = "in_person" | "online" | "both";

export interface Service {
  id: string;
  organizationId: string;
  /** Primary staff profile this service belongs to. */
  coachId: string;
  staffId?: string;
  locationId?: string;
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

export const WIDGET_SECTION_KEYS = [
  "ask",
  "lessons",
  "videos",
  "coach",
  "staff",
  "tee_times",
  "course",
  "events",
  "membership",
  "rates",
  "practice",
  "dining",
  "pro_shop",
  "tournaments",
  "weddings",
  "simulator",
  "directions",
  "drills",
  "resources",
  "faq",
  "swing",
  "contact",
  "custom",
] as const;

export type WidgetSectionKey = (typeof WIDGET_SECTION_KEYS)[number];

export const WIDGET_MENU_ICONS = [
  "chat",
  "flag",
  "video",
  "person",
  "target",
  "book",
  "question",
  "upload",
  "mail",
  "link",
  "calendar",
  "map",
  "shop",
  "utensils",
  "users",
  "ticket",
] as const;

export type WidgetMenuIcon = (typeof WIDGET_MENU_ICONS)[number];

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

export type QuickActionKey =
  | "ask"
  | "tee_times"
  | "rates"
  | "membership"
  | "lessons"
  | "swing"
  | "events"
  | "contact";

export interface WidgetQuickAction {
  id: string;
  key: QuickActionKey;
  label: string;
  enabled: boolean;
  sortOrder: number;
}

export type LauncherIcon = "chat" | "flag" | "golf" | "help";

export type LauncherStyle = "icon" | "icon_text" | "text";

export interface WidgetTheme {
  assistantName: string;
  welcomeMessage: string;
  launcherText: string;
  launcherIcon: LauncherIcon;
  /** How the floating launcher renders. Missing values are treated as icon_text. */
  launcherStyle: LauncherStyle;
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
  quickActions: WidgetQuickAction[];
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
  category?: KnowledgeCategory;
  volatility?: KnowledgeVolatility;
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
  category?: KnowledgeCategory;
  volatility?: KnowledgeVolatility;
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
  partySize?: number;
  desiredDate?: string;
  company?: string;
  membershipInterest?: string;
  eventType?: string;
}

export interface AnswerSource {
  sourceId: string;
  title: string;
  type: KnowledgeSourceType | "announcement";
}

export interface PublicTeeTime {
  provider: string;
  externalId: string;
  facilityId?: string;
  facilityName?: string;
  courseName?: string;
  startTime: string;
  timezone: string;
  availablePlayers?: number;
  minPlayers?: number;
  maxPlayers?: number;
  holes?: number;
  pricePerPlayer?: number;
  currency?: string;
  cartIncluded?: boolean | null;
  walkingAllowed?: boolean | null;
  rateName?: string;
  rateType?: string;
  bookingUrl?: string;
  bookable: boolean;
  demo?: boolean;
}

export type MessageCard =
  | { kind: "video"; contentId: string; title: string; url: string; thumbnailUrl?: string }
  | { kind: "service"; serviceId: string }
  | { kind: "staff"; staffId: string }
  | { kind: "capture"; prompt: string; leadType?: LeadType }
  | { kind: "swing_upload"; prompt: string }
  | { kind: "booking"; serviceId?: string; label: string }
  | { kind: "contact"; label: string }
  | { kind: "booking_url"; label: string; url: string; tracking?: "tee_time_booking_clicked" | "booking_clicked" }
  | {
      kind: "tee_times";
      teeTimes: PublicTeeTime[];
      provider: string;
      searchedAt: string;
      demo?: boolean;
      bookingUrl?: string;
      notice?: string;
    };

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
  leadType: LeadType;
  intentScore: number;
  intentLevel: IntentLevel;
  interest?: string;
  company?: string;
  eventDate?: string;
  estimatedPlayers?: number;
  foodBeverage?: string;
  membershipInterest?: string;
  comments?: string;
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
  locations: Location[];
  staff: StaffMember[];
  announcements: CourseAnnouncement[];
  bookingIntegrations: BookingIntegration[];
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
  email?: string;
  timezone?: string;
}

export interface PublicStaff {
  id: string;
  name: string;
  title: string;
  bio: string;
  specialties: string[];
  profilePhotoUrl?: string;
  bookingUrl?: string;
}

export interface PublicLocation {
  id: string;
  name: string;
  address?: string;
  timezone: string;
}

export interface TeeTimePublicConfig {
  provider: TeeTimeProviderId;
  bookingUrl?: string;
  supportsLiveSearch: boolean;
  demoInventory: boolean;
}

export interface PublicWidget {
  widget: Pick<
    LessonWidget,
    "id" | "publicId" | "slug" | "status" | "theme" | "menu" | "defaultSectionKey" | "allowedOrigins"
  >;
  organizationType: OrganizationType;
  coach: PublicCoach;
  staff: PublicStaff[];
  locations: PublicLocation[];
  announcements: Array<Pick<CourseAnnouncement, "id" | "title" | "message" | "priority">>;
  teeTime: TeeTimePublicConfig | null;
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
  teeTimeSearches: number;
  teeTimeResults: number;
  teeTimeBookingClicks: number;
  confirmedTeeTimeBookings: number;
  lessonLeads: number;
  membershipLeads: number;
  tournamentLeads: number;
  otherLeads: number;
  conversationToLeadRate: number;
  conversationToBookingClickRate: number;
  visitorToLeadRate: number;
  leadToBookingClickRate: number;
  conversationToLeadRate: number;
  conversationToBookingClickRate: number;
  funnel: FunnelStage[];
  leadFunnels: Array<{ label: string; count: number }>;
  topServices: Array<{ label: string; count: number; percentage: number }>;
  topTopics: Array<{ label: string; count: number; percentage: number }>;
}

export function intentLevelForScore(score: number): IntentLevel {
  if (score >= 70) return "high";
  if (score >= 31) return "medium";
  return "low";
}

export const LEAD_TYPE_LABELS: Record<LeadType, string> = {
  lesson: "Lesson",
  membership: "Membership",
  tournament: "Tournament",
  corporate_event: "Corporate event",
  wedding: "Wedding",
  group_outing: "Group outing",
  junior_program: "Junior program",
  fitting: "Fitting",
  simulator: "Simulator",
  restaurant_event: "Restaurant event",
  general: "General",
};
