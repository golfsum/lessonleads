import type {
  BookingProvider,
  NotificationPrefs,
  WidgetMenuItem,
  WidgetTheme,
} from "./types";

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  newLead: true,
  highIntentLead: true,
  swingUpload: true,
  bookingClick: true,
  everyConversation: false,
};

export function defaultTheme(firstName: string): WidgetTheme {
  const name = firstName.trim() || "Coach";
  return {
    assistantName: `Ask ${name}`,
    welcomeMessage: `Hey, I'm ${name}'s coaching assistant. Tell me what you're struggling with and I'll point you in the right direction.`,
    launcherText: `Ask Coach ${name}`,
    launcherIcon: "golf",
    position: "bottom_right",
    size: "standard",
    primaryColor: "#1b552c",
    accentColor: "#c8a24a",
    backgroundColor: "#faf8f3",
    textColor: "#182420",
    buttonColor: "#1b552c",
    borderRadius: 14,
    appearance: "light",
    suggestedQuestions: [
      "Why do I slice my driver?",
      "Which lesson is right for me?",
      "Do you offer online coaching?",
      "Can I upload my swing?",
    ],
  };
}

export function defaultMenu(firstName: string): WidgetMenuItem[] {
  const name = firstName.trim() || "Coach";
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
