import { isCourseLike } from "./organization";
import type {
  BookingProvider,
  NotificationPrefs,
  OrganizationType,
  WidgetMenuItem,
  WidgetQuickAction,
  WidgetTheme,
} from "./types";

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  newLead: true,
  highIntentLead: true,
  swingUpload: true,
  bookingClick: true,
  everyConversation: false,
};

export const DEFAULT_CONVERSION_GOALS = {
  golf_coach: ["lesson_lead", "lesson_booking"],
  golf_academy: ["lesson_lead", "lesson_booking"],
  golf_course: ["tee_time_click", "membership_lead", "tournament_lead", "lesson_lead"],
  golf_facility: ["tee_time_click", "lesson_lead", "service_lead"],
  golf_fitting_studio: ["fitting_lead", "service_lead"],
  golf_retailer: ["service_lead"],
} as const;

export function defaultQuickActions(type: OrganizationType = "golf_coach"): WidgetQuickAction[] {
  if (isCourseLike(type)) {
    return [
      { id: "qa_tee", key: "tee_times", label: "Find Tee Time", enabled: true, sortOrder: 0 },
      { id: "qa_rates", key: "rates", label: "View Rates", enabled: true, sortOrder: 1 },
      { id: "qa_member", key: "membership", label: "Membership", enabled: true, sortOrder: 2 },
      { id: "qa_lesson", key: "lessons", label: "Book Lesson", enabled: true, sortOrder: 3 },
    ];
  }
  if (type === "golf_academy") {
    return [
      { id: "qa_ask", key: "ask", label: "Ask a Question", enabled: true, sortOrder: 0 },
      { id: "qa_lesson", key: "lessons", label: "Book Lesson", enabled: true, sortOrder: 1 },
    ];
  }
  return [
    { id: "qa_ask", key: "ask", label: "Ask a Question", enabled: true, sortOrder: 0 },
    { id: "qa_lesson", key: "lessons", label: "Book Lesson", enabled: true, sortOrder: 1 },
    { id: "qa_swing", key: "swing", label: "Upload Swing", enabled: true, sortOrder: 2 },
  ];
}

export function defaultSuggestedQuestions(type: OrganizationType): string[] {
  if (isCourseLike(type)) {
    return [
      "Any tee times tomorrow morning?",
      "How much is a membership?",
      "Do you have club rentals?",
      "Can I host a tournament?",
    ];
  }
  if (type === "golf_academy") {
    return [
      "Which coach is right for a beginner?",
      "Do you have junior programs?",
      "How do I book a lesson?",
      "What does a playing lesson include?",
    ];
  }
  if (type === "golf_fitting_studio") {
    return ["Do you do driver fittings?", "How long is a fitting?", "What should I bring?", "How do I book?"];
  }
  return [
    "Why do I slice my driver?",
    "Which lesson is right for me?",
    "Do you offer online coaching?",
    "Can I upload my swing?",
  ];
}

export function defaultTheme(firstName: string, type: OrganizationType = "golf_coach"): WidgetTheme {
  const name = firstName.trim() || (isCourseLike(type) ? "the course" : "Coach");
  if (isCourseLike(type)) {
    return {
      assistantName: `Ask ${name}`,
      welcomeMessage: `Welcome to ${name}. I can help with tee times, rates, memberships, events, and lessons.`,
      launcherText: `Ask ${name}`,
      launcherIcon: "golf",
      launcherStyle: "icon_text",
      position: "bottom_right",
      size: "standard",
      primaryColor: "#1b552c",
      accentColor: "#c8a24a",
      backgroundColor: "#faf8f3",
      textColor: "#182420",
      buttonColor: "#1b552c",
      borderRadius: 14,
      appearance: "light",
      suggestedQuestions: defaultSuggestedQuestions(type),
      quickActions: defaultQuickActions(type),
    };
  }
  return {
    assistantName: `Ask ${name}`,
    welcomeMessage: `Hey, I'm ${name}'s coaching assistant. Tell me what you're struggling with and I'll point you in the right direction.`,
    launcherText: `Ask Coach ${name}`,
    launcherIcon: "golf",
    launcherStyle: "icon_text",
    position: "bottom_right",
    size: "standard",
    primaryColor: "#1b552c",
    accentColor: "#c8a24a",
    backgroundColor: "#faf8f3",
    textColor: "#182420",
    buttonColor: "#1b552c",
    borderRadius: 14,
    appearance: "light",
    suggestedQuestions: defaultSuggestedQuestions(type),
    quickActions: defaultQuickActions(type),
  };
}

export function defaultMenu(firstName: string, type: OrganizationType = "golf_coach"): WidgetMenuItem[] {
  const name = firstName.trim() || "Coach";
  if (isCourseLike(type)) {
    return [
      { id: "menu_ask", key: "ask", title: "Ask", icon: "chat", enabled: true, sortOrder: 0 },
      { id: "menu_tee", key: "tee_times", title: "Tee Times", icon: "calendar", enabled: true, sortOrder: 1 },
      { id: "menu_course", key: "course", title: "Course", icon: "flag", enabled: true, sortOrder: 2 },
      { id: "menu_lessons", key: "lessons", title: "Lessons", icon: "target", enabled: true, sortOrder: 3 },
      { id: "menu_events", key: "events", title: "Events", icon: "ticket", enabled: true, sortOrder: 4 },
      { id: "menu_membership", key: "membership", title: "Membership", icon: "users", enabled: false, sortOrder: 5 },
      { id: "menu_rates", key: "rates", title: "Rates", icon: "book", enabled: false, sortOrder: 6 },
      { id: "menu_practice", key: "practice", title: "Practice", icon: "target", enabled: false, sortOrder: 7 },
      { id: "menu_dining", key: "dining", title: "Dining", icon: "utensils", enabled: false, sortOrder: 8 },
      { id: "menu_shop", key: "pro_shop", title: "Pro Shop", icon: "shop", enabled: false, sortOrder: 9 },
      { id: "menu_staff", key: "staff", title: "Golf Staff", icon: "person", enabled: false, sortOrder: 10 },
      { id: "menu_faq", key: "faq", title: "FAQ", icon: "question", enabled: false, sortOrder: 11 },
      { id: "menu_contact", key: "contact", title: "Contact", icon: "mail", enabled: false, sortOrder: 12 },
      { id: "menu_directions", key: "directions", title: "Directions", icon: "map", enabled: false, sortOrder: 13 },
    ];
  }
  if (type === "golf_academy") {
    return [
      { id: "menu_ask", key: "ask", title: `Ask ${name}`, icon: "chat", enabled: true, sortOrder: 0 },
      { id: "menu_lessons", key: "lessons", title: "Lessons", icon: "flag", enabled: true, sortOrder: 1 },
      { id: "menu_staff", key: "staff", title: "Coaches", icon: "person", enabled: true, sortOrder: 2 },
      { id: "menu_videos", key: "videos", title: "Videos", icon: "video", enabled: true, sortOrder: 3 },
      { id: "menu_faq", key: "faq", title: "FAQ", icon: "question", enabled: false, sortOrder: 4 },
      { id: "menu_contact", key: "contact", title: "Contact", icon: "mail", enabled: false, sortOrder: 5 },
    ];
  }
  return [
    { id: "menu_ask", key: "ask", title: `Ask ${name}`, icon: "chat", enabled: true, sortOrder: 0 },
    { id: "menu_lessons", key: "lessons", title: "Lessons", icon: "flag", enabled: true, sortOrder: 1 },
    { id: "menu_videos", key: "videos", title: "Videos", icon: "video", enabled: true, sortOrder: 2 },
    { id: "menu_swing", key: "swing", title: "Upload Swing", icon: "upload", enabled: true, sortOrder: 3 },
    { id: "menu_coach", key: "coach", title: `About ${name}`, icon: "person", enabled: true, sortOrder: 4 },
    { id: "menu_faq", key: "faq", title: "FAQ", icon: "question", enabled: false, sortOrder: 5 },
    { id: "menu_drills", key: "drills", title: "Drills", icon: "target", enabled: false, sortOrder: 6 },
    { id: "menu_resources", key: "resources", title: "Resources", icon: "book", enabled: false, sortOrder: 7 },
    { id: "menu_contact", key: "contact", title: "Contact", icon: "mail", enabled: false, sortOrder: 8 },
  ];
}

export function firstNameFrom(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || "Coach";
}

export const DEFAULT_BOOKING_PROVIDER: BookingProvider = "none";

export const TEE_TIME_PROVIDER_OPTIONS: Array<{
  value: import("./types").TeeTimeProviderId;
  label: string;
  liveAvailability: string;
  booking: string;
}> = [
  { value: "golfnow", label: "GolfNow", liveAvailability: "Supported", booking: "Supported if API access is configured" },
  { value: "foreup", label: "foreUP", liveAvailability: "Integration-dependent", booking: "Integration-dependent" },
  { value: "lightspeed", label: "Lightspeed Golf", liveAvailability: "Not live yet", booking: "Booking URL handoff" },
  { value: "chronogolf", label: "Chronogolf", liveAvailability: "Not live yet", booking: "Booking URL handoff" },
  { value: "club_caddie", label: "Club Caddie", liveAvailability: "Not live yet", booking: "Booking URL handoff" },
  { value: "custom_url", label: "Custom Booking URL", liveAvailability: "No", booking: "Booking handoff: Yes" },
  { value: "none", label: "None", liveAvailability: "No", booking: "No" },
];
