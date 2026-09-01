import "server-only";

import { plans } from "@/lib/billing/plans";
import { DEFAULT_NOTIFICATION_PREFS } from "@/lib/domain/defaults";
import type { FaqItem, KnowledgeChunk, KnowledgeSource, Service, WorkspaceData } from "@/lib/domain/types";
import { SITE_COACH_ID, SITE_ORG_ID, SITE_WIDGET_ID, SITE_WIDGET_PUBLIC_ID } from "./ids";

function appOrigin() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "https://lessonleads.com").replace(/\/$/, "");
}

function signupUrl() {
  return "/signup";
}

const LOGO_PATH = "/logo.jpg";

const now = "2026-08-26T00:00:00.000Z";

function source(id: string, title: string, url: string): KnowledgeSource {
  return {
    id,
    organizationId: SITE_ORG_ID,
    coachId: SITE_COACH_ID,
    type: "website_page",
    title,
    url,
    status: "synced",
    includeInAi: true,
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

function chunk(id: string, sourceId: string, title: string, content: string, position: number, url: string): KnowledgeChunk {
  return {
    id,
    organizationId: SITE_ORG_ID,
    coachId: SITE_COACH_ID,
    sourceId,
    sourceType: "website_page",
    title,
    url,
    content,
    position,
    updatedAt: now,
  };
}

function faq(id: string, question: string, answer: string, sortOrder: number): FaqItem {
  return {
    id,
    organizationId: SITE_ORG_ID,
    question,
    answer,
    enabled: true,
    sortOrder,
  };
}

function planService(input: {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  priceLabel: string;
  ctaLabel: string;
  featured: boolean;
  bestFor: string[];
  sortOrder: number;
}): Service {
  return {
    id: input.id,
    organizationId: SITE_ORG_ID,
    coachId: SITE_COACH_ID,
    slug: input.id.replace(/^svc_site_/, ""),
    name: input.name,
    description: input.description,
    priceCents: input.priceCents,
    priceLabel: input.priceLabel,
    durationMinutes: null,
    mode: "online",
    bookingUrl: signupUrl(),
    ctaLabel: input.ctaLabel,
    featured: input.featured,
    bestFor: input.bestFor,
    active: true,
    sortOrder: input.sortOrder,
  };
}

export function buildSiteWorkspace(): WorkspaceData {
  const origin = appOrigin();
  const signup = signupUrl();
  const logoUrl = LOGO_PATH;

  const knowledgeSources: KnowledgeSource[] = [
    source("src_site_home", "What LessonLeads is", `${origin}/`),
    source("src_site_how", "How LessonLeads works", `${origin}/how-it-works`),
    source("src_site_pricing", "Pricing", `${origin}/pricing`),
    source("src_site_install", "Installing the widget", `${origin}/golf-coach-website-widget`),
  ];

  const knowledgeChunks: KnowledgeChunk[] = [
    chunk(
      "chk_site_about",
      "src_site_home",
      "What LessonLeads is",
      [
        "LessonLeads is an embeddable widget for golf coaches and instructors.",
        "It turns golf website traffic into booked lessons.",
        "The widget learns from the coach's public website, FAQ, and videos, then answers visitor questions, captures qualified leads, and sends golfers to the booking tool the coach already uses.",
        "LessonLeads is not a calendar, LMS, or payment system. Coaches keep Calendly, CoachNow, Acuity, Golf Genius, Square, Mindbody, or their own booking page.",
        "The core line: LessonLeads turns your golf website traffic into booked lessons.",
        "Questions for the LessonLeads team go to support@lessonleads.com.",
      ].join(" "),
      0,
      `${origin}/`,
    ),
    chunk(
      "chk_site_how",
      "src_site_how",
      "How it works",
      [
        "Setup takes five steps. Connect your website so LessonLeads can read public pages. Customize the widget with your name, logo, colors, and sections. Paste one script tag on WordPress, Squarespace, Wix, Webflow, or a custom site.",
        "Visitors ask about rates, a slice, junior lessons, or online coaching. Answers come from your approved content, not generic golf advice.",
        "When a golfer is ready, the widget asks for a name and email. You get the lead in your dashboard with the conversation, a summary, their goal, and any swing they uploaded.",
        "Booking is a link handoff. LessonLeads tracks the click. It never claims a lesson was booked unless you mark it.",
      ].join(" "),
      0,
      `${origin}/how-it-works`,
    ),
    chunk(
      "chk_site_pricing",
      "src_site_pricing",
      "Plans and pricing",
      [
        `Free is ${plans.free.priceLabel}. ${plans.free.description} It includes up to ${plans.free.monthlyConversations} AI conversations per month, ${plans.free.monthlyLeads} leads, and LessonLeads branding on the widget.`,
        `Solo is ${plans.solo.priceLabel} ${plans.solo.priceNote}. ${plans.solo.description} It includes ${plans.solo.monthlyConversations} AI conversations per month and unlimited leads, plus custom widget branding, website knowledge, booking handoff, conversation history, and analytics.`,
        `Pro is ${plans.pro.priceLabel} ${plans.pro.priceNote}. ${plans.pro.description} It includes ${plans.pro.monthlyConversations} AI conversations per month, everything in Solo, YouTube knowledge, video recommendations, swing uploads, follow-up tools, and conversion analytics.`,
        `Academy is ${plans.academy.priceLabel} ${plans.academy.priceNote}. ${plans.academy.description} It includes ${plans.academy.monthlyConversations} AI conversations per month, everything in Pro, multiple coaches, multiple services, lead routing, team access, and academy-level analytics.`,
        "An AI conversation is one visitor session, not every message. Opening the widget, browsing plans, and chatting in the dashboard preview do not count.",
        `Start at lessonleads.com/signup. No card is required for Free.`,
      ].join(" "),
      0,
      `${origin}/pricing`,
    ),
    chunk(
      "chk_site_booking",
      "src_site_home",
      "Works with existing booking tools",
      [
        "LessonLeads sits in front of the booking system you already use.",
        "It works with Calendly, CoachNow, Acuity Scheduling, Golf Genius, Square Appointments, Mindbody, and custom booking URLs.",
        "Golfers never book inside LessonLeads. The widget sends them to your existing booking page after it has the context you need.",
      ].join(" "),
      1,
      `${origin}/`,
    ),
    chunk(
      "chk_site_install",
      "src_site_install",
      "How to install",
      [
        "After signup you get one script tag. Paste it before the closing body tag on every page where you want the widget, or on a dedicated lessons page.",
        "The default is a floating button. You can also embed the widget inline.",
        "You can add your site logo in onboarding and in dashboard widget setup so the header matches your academy branding.",
        "Allowed domains can lock the widget to your site. Localhost is always allowed for testing.",
      ].join(" "),
      0,
      `${origin}/golf-coach-website-widget`,
    ),
  ];

  const faqs: FaqItem[] = [
    faq(
      "faq_site_what",
      "What is LessonLeads?",
      "An embeddable widget for golf coaches. It answers visitor questions from your website and videos, captures qualified leads, and sends golfers to the booking page you already use.",
      0,
    ),
    faq(
      "faq_site_booking",
      "Does it replace Calendly or CoachNow?",
      "No. LessonLeads is not a calendar. It qualifies the golfer, then hands them to Calendly, CoachNow, Acuity, Golf Genius, or whatever booking URL you already use.",
      1,
    ),
    faq(
      "faq_site_cost",
      "How much does it cost?",
      `Free is ${plans.free.priceLabel} with ${plans.free.monthlyConversations} AI conversations and ${plans.free.monthlyLeads} leads per month. Solo is ${plans.solo.priceLabel}/month with ${plans.solo.monthlyConversations} AI conversations. Pro is ${plans.pro.priceLabel}/month with ${plans.pro.monthlyConversations} AI conversations. Academy is ${plans.academy.priceLabel}/month with ${plans.academy.monthlyConversations} AI conversations for multi-coach businesses.`,
      2,
    ),
    faq(
      "faq_site_install",
      "How do I put it on my site?",
      "Sign up, connect your website, customize the widget, then paste one script tag. It works on WordPress, Squarespace, Wix, Webflow, and custom sites.",
      3,
    ),
    faq(
      "faq_site_branding",
      "Can I use my own logo and colors?",
      "Yes. Add your site logo and brand colors in onboarding or under Widget in the dashboard. Solo, Pro, and Academy include custom widget branding.",
      4,
    ),
    faq(
      "faq_site_start",
      "How do I get started?",
      `Create a free account at lessonleads.com/signup. No card required. You can scan your site, preview the widget, and install when you are ready.`,
      5,
    ),
    faq(
      "faq_site_contact",
      "How do I contact LessonLeads?",
      "Email support@lessonleads.com. We can help with plans, install, and whether the widget fits your coaching site.",
      6,
    ),
  ];

  const services: Service[] = [
    planService({
      id: "svc_site_free",
      name: plans.free.name,
      description: `${plans.free.description} ${plans.free.features.join(" ")}`,
      priceCents: plans.free.priceCents,
      priceLabel: plans.free.priceLabel,
      ctaLabel: "Start free",
      featured: false,
      bestFor: ["trying it on your site", "no card required"],
      sortOrder: 0,
    }),
    planService({
      id: "svc_site_solo",
      name: plans.solo.name,
      description: `${plans.solo.description} ${plans.solo.features.join(" ")}`,
      priceCents: plans.solo.priceCents,
      priceLabel: `${plans.solo.priceLabel}/mo`,
      ctaLabel: "Start with Solo",
      featured: true,
      bestFor: ["independent coaches", "your branding"],
      sortOrder: 1,
    }),
    planService({
      id: "svc_site_pro",
      name: plans.pro.name,
      description: `${plans.pro.description} ${plans.pro.features.join(" ")}`,
      priceCents: plans.pro.priceCents,
      priceLabel: `${plans.pro.priceLabel}/mo`,
      ctaLabel: "Go Pro",
      featured: false,
      bestFor: ["YouTube", "swing uploads", "analytics"],
      sortOrder: 2,
    }),
    planService({
      id: "svc_site_academy",
      name: plans.academy.name,
      description: `${plans.academy.description} ${plans.academy.features.join(" ")}`,
      priceCents: plans.academy.priceCents,
      priceLabel: `${plans.academy.priceLabel}/mo`,
      ctaLabel: "Start Academy",
      featured: false,
      bestFor: ["multiple coaches", "lead routing", "team access"],
      sortOrder: 3,
    }),
  ];

  return {
    organization: {
      id: SITE_ORG_ID,
      name: "LessonLeads",
      slug: SITE_WIDGET_PUBLIC_ID,
      type: "golf_coach",
      conversionGoals: ["lesson_lead", "lesson_booking"],
      createdAt: now,
    },
    coach: {
      id: SITE_COACH_ID,
      organizationId: SITE_ORG_ID,
      name: "LessonLeads",
      businessName: "LessonLeads",
      email: "support@lessonleads.com",
      website: "/",
      location: "Online, for golf coaches anywhere",
      timezone: "America/Phoenix",
      title: "Lesson funnel for golf coaches",
      credentials: [],
      bio: "LessonLeads turns golf website traffic into booked lessons. The widget learns from a coach's site, answers golfer questions, captures qualified leads, and hands off to the booking tool they already use.",
      philosophy:
        "We sit in front of Calendly, CoachNow, and the rest. We do not replace your calendar. We give visitors a reason to talk, and we give you their name, email, and what they need help with.",
      teachingFocus: [
        "Answers grounded in your website",
        "Qualified leads with conversation context",
        "Handoff to the booking page you already use",
      ],
      socialLinks: {},
      bookingProvider: "custom",
      bookingUrl: signup,
      profilePhotoUrl: logoUrl,
      notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS, newLead: true, highIntentLead: true },
    },
    locations: [],
    staff: [],
    announcements: [],
    bookingIntegrations: [],
    services,
    widget: {
      id: SITE_WIDGET_ID,
      organizationId: SITE_ORG_ID,
      coachId: SITE_COACH_ID,
      publicId: SITE_WIDGET_PUBLIC_ID,
      slug: SITE_WIDGET_PUBLIC_ID,
      name: "LessonLeads",
      status: "active",
      allowedOrigins: [],
      theme: {
        assistantName: "Ask LessonLeads",
        welcomeMessage:
          "Hey, I'm the LessonLeads assistant. I can walk you through how the widget works, what's on each plan, and how to get it on your golf site.",
        launcherText: "Ask LessonLeads",
        launcherIcon: "golf",
        launcherStyle: "icon",
        position: "bottom_right",
        size: "standard",
        primaryColor: "#1b552c",
        accentColor: "#c8a24a",
        backgroundColor: "#faf8f3",
        textColor: "#182420",
        buttonColor: "#1b552c",
        borderRadius: 14,
        appearance: "light",
        logoUrl,
        suggestedQuestions: [
          "How does LessonLeads work?",
          "What's included on each plan?",
          "Will it work with Calendly or CoachNow?",
          "How do I put this on my site?",
        ],
        quickActions: [
          { id: "qa_ask", key: "ask", label: "Ask a Question", enabled: true, sortOrder: 0 },
          { id: "qa_lesson", key: "lessons", label: "See plans", enabled: true, sortOrder: 1 },
        ],
      },
      menu: [
        { id: "menu_site_ask", key: "ask", title: "Ask", icon: "chat", enabled: true, sortOrder: 0 },
        { id: "menu_site_plans", key: "lessons", title: "Plans", icon: "flag", enabled: true, sortOrder: 1 },
        { id: "menu_site_about", key: "coach", title: "About", icon: "person", enabled: true, sortOrder: 2 },
        { id: "menu_site_faq", key: "faq", title: "FAQ", icon: "question", enabled: true, sortOrder: 3 },
        { id: "menu_site_contact", key: "contact", title: "Contact", icon: "mail", enabled: true, sortOrder: 4 },
      ],
      defaultSectionKey: "ask",
      createdAt: now,
      updatedAt: now,
    },
    leads: [],
    conversations: [],
    knowledgeSources,
    knowledgeChunks,
    faqs,
    contentItems: [],
    swingUploads: [],
    events: [],
    subscription: {
      organizationId: SITE_ORG_ID,
      plan: "pro",
      status: "active",
    },
    website: {
      url: origin,
      scanStatus: "scanned",
      lastScanAt: now,
      pagesFound: knowledgeSources.length,
    },
    demo: false,
  };
}
