import "server-only";

import { DEFAULT_NOTIFICATION_PREFS, defaultMenu, defaultQuickActions, defaultTheme } from "@/lib/domain/defaults";
import type { FaqItem, KnowledgeChunk, KnowledgeSource, Service, WorkspaceData } from "@/lib/domain/types";
import {
  COURSE_DEMO_COACH_ID,
  COURSE_DEMO_ORG_ID,
  COURSE_DEMO_PUBLIC_ID,
  COURSE_DEMO_WIDGET_ID,
} from "./ids";

const now = "2026-08-28T16:00:00.000Z";
const origin = "https://desertfairways.example";

function source(
  id: string,
  title: string,
  path: string,
  category: KnowledgeSource["category"],
  volatility: KnowledgeSource["volatility"],
): KnowledgeSource {
  return {
    id,
    organizationId: COURSE_DEMO_ORG_ID,
    coachId: COURSE_DEMO_COACH_ID,
    type: "website_page",
    title,
    url: `${origin}${path}`,
    status: "synced",
    includeInAi: true,
    category,
    volatility,
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

function chunk(
  id: string,
  sourceId: string,
  title: string,
  content: string,
  position: number,
  path: string,
  category: KnowledgeChunk["category"],
  volatility: KnowledgeChunk["volatility"],
): KnowledgeChunk {
  return {
    id,
    organizationId: COURSE_DEMO_ORG_ID,
    coachId: COURSE_DEMO_COACH_ID,
    sourceId,
    sourceType: "website_page",
    title,
    url: `${origin}${path}`,
    category,
    volatility,
    content,
    position,
    updatedAt: now,
  };
}

function faq(id: string, question: string, answer: string, sortOrder: number): FaqItem {
  return { id, organizationId: COURSE_DEMO_ORG_ID, question, answer, enabled: true, sortOrder };
}

function service(input: Omit<Service, "organizationId" | "coachId" | "active">): Service {
  return { ...input, organizationId: COURSE_DEMO_ORG_ID, coachId: COURSE_DEMO_COACH_ID, active: true };
}

export function buildCourseDemoWorkspace(): WorkspaceData {
  const knowledgeSources: KnowledgeSource[] = [
    source("src_course", "About the Course", "/course", "course", "static"),
    source("src_rates", "Rates", "/rates", "rates", "frequently_changing"),
    source("src_policies", "Policies", "/policies", "policies", "static"),
    source("src_practice", "Practice Facility", "/practice", "practice", "frequently_changing"),
    source("src_membership", "Membership", "/membership", "membership", "frequently_changing"),
    source("src_events", "Outings & Events", "/events", "events", "frequently_changing"),
    source("src_dining", "The Grill", "/restaurant", "dining", "frequently_changing"),
    source("src_lessons", "Golf Instruction", "/lessons", "instruction", "static"),
    source("src_shop", "Pro Shop", "/pro-shop", "general", "static"),
  ];

  const knowledgeChunks: KnowledgeChunk[] = [
    chunk("chk_course_1", "src_course", "About the Course", "Desert Fairways Golf Club is a public 36-hole facility in Tucson, Arizona, with a North Course and a South Course. The North Course is a championship layout. The South Course is a shorter, more walkable parkland course.", 0, "/course", "course", "static"),
    chunk("chk_rates_1", "src_rates", "Green fees", "Published rack rates: weekday 18 holes $64 per player, weekend 18 holes $79 per player, twilight after 3 PM $49 per player. Carts are an extra $22 unless a rate says cart included. These are published rates, not live tee-sheet prices.", 0, "/rates", "rates", "frequently_changing"),
    chunk("chk_policies_1", "src_policies", "Carts and walking", "Carts are available on both courses. Walking is allowed on the South Course all day. Walking on the North Course is allowed after 1 PM. Club rentals are available in the pro shop.", 0, "/policies", "policies", "static"),
    chunk("chk_policies_2", "src_policies", "Dress code and juniors", "Collared shirts and golf shoes or soft spikes are required. Juniors are welcome. Players under 16 should play with an adult unless they are in a junior clinic.", 1, "/policies", "policies", "static"),
    chunk("chk_practice_1", "src_practice", "Driving range", "The driving range, putting green, and short-game area are open to the public. Typical range hours are 6:30 AM to 7:00 PM, but the club posts same-day changes in the widget announcements.", 0, "/practice", "practice", "frequently_changing"),
    chunk("chk_member_1", "src_membership", "Membership options", "Full Golf Membership includes unlimited golf on both courses and a cart discount. Weekday Membership covers Monday through Friday excluding holidays. Junior memberships are available for golfers 17 and under. Current published prices are listed on the membership page: Full Golf $4,800 per year, Weekday $2,900 per year. The membership office confirms current availability.", 0, "/membership", "membership", "frequently_changing"),
    chunk("chk_events_1", "src_events", "Tournaments and outings", "Desert Fairways hosts company outings, charity scrambles, and member-guest events. Groups of 24 or more should contact the events team. Shotgun starts are available on the South Course. Food and beverage packages can include boxed lunch or a post-round grill buffet.", 0, "/events", "events", "frequently_changing"),
    chunk("chk_dining_1", "src_dining", "The Grill", "The Grill is open for breakfast and lunch most days, with a limited dinner menu on Friday and Saturday. Hours change seasonally. The club does not publish a live wait time in this widget.", 0, "/restaurant", "dining", "frequently_changing"),
    chunk("chk_lessons_1", "src_lessons", "Golf instruction", "The golf school is led by Sarah Jones, Director of Instruction, with PGA Professional Mike Smith on staff. Beginner, junior, and playing lessons are offered. Lesson times are booked with the teaching professional, not through the tee sheet.", 0, "/lessons", "instruction", "static"),
    chunk("chk_shop_1", "src_shop", "Pro shop", "The pro shop stocks balls, gloves, and a small rental set of clubs. Club fittings are by appointment with the teaching staff.", 0, "/pro-shop", "general", "static"),
  ];

  const faqs: FaqItem[] = [
    faq("faq_fees", "What are your green fees?", "Published weekday 18-hole rates are $64 per player and weekend rates are $79. Twilight after 3 PM is $49. Live tee-sheet prices can differ until a time is booked.", 0),
    faq("faq_carts", "Are carts included?", "Carts are extra at $22 unless a rate says cart included. Walking is allowed on the South Course all day and on the North Course after 1 PM.", 1),
    faq("faq_walk", "Can I walk?", "Yes on the South Course. North Course walking starts after 1 PM.", 2),
    faq("faq_rentals", "Do you rent clubs?", "Yes. Rental sets are available in the pro shop.", 3),
    faq("faq_range", "Do you have a driving range?", "Yes. Range, putting green, and short-game area are open to the public.", 4),
    faq("faq_range_hours", "What time does the range close?", "Typical hours are 6:30 AM to 7:00 PM. Same-day changes are posted as a course announcement.", 5),
    faq("faq_twilight", "Do you have twilight rates?", "Yes. Twilight after 3 PM is published at $49 per player. Confirm the live rate when you book.", 6),
    faq("faq_juniors", "Are juniors allowed?", "Yes. Players under 16 should play with an adult unless they are in a junior clinic.", 7),
    faq("faq_dress", "What's your dress code?", "Collared shirts and golf shoes or soft spikes.", 8),
    faq("faq_grill", "Do you have a restaurant?", "The Grill is on site for breakfast and lunch, with a limited dinner menu Friday and Saturday.", 9),
    faq("faq_lessons", "Do you have lessons?", "Yes. Sarah Jones and Mike Smith teach beginners, juniors, and playing lessons.", 10),
    faq("faq_event", "Can I host a tournament?", "Yes. Groups of 24 or more should contact the events team for a date, shotgun options, and food and beverage.", 11),
    faq("faq_member", "Do you have memberships?", "Full Golf, Weekday, and Junior memberships are offered. Published prices are on the membership page. Ask us to have the club follow up.", 12),
  ];

  const services: Service[] = [
    service({
      id: "svc_beginner",
      staffId: "staff_mike",
      name: "Beginner Lesson",
      slug: "beginner-lesson",
      description: "A 45-minute intro lesson covering grip, setup, and a simple swing you can repeat. Best first step for new golfers.",
      priceCents: 8500,
      durationMinutes: 45,
      mode: "in_person",
      location: "Desert Fairways practice tee",
      bookingUrl: "https://calendly.com/desertfairways/beginner",
      ctaLabel: "Book a beginner lesson",
      featured: true,
      bestFor: ["beginner", "new golfer", "fundamentals"],
      sortOrder: 0,
    }),
    service({
      id: "svc_playing",
      staffId: "staff_mike",
      name: "9-Hole Playing Lesson",
      slug: "playing-lesson",
      description: "Play nine with a teaching professional and work on course management, club selection, and on-course misses.",
      priceCents: 18000,
      durationMinutes: 150,
      mode: "in_person",
      location: "South Course",
      bookingUrl: "https://calendly.com/desertfairways/playing",
      ctaLabel: "Book a playing lesson",
      featured: false,
      bestFor: ["course management", "on-course", "intermediate"],
      sortOrder: 1,
    }),
    service({
      id: "svc_junior",
      staffId: "staff_sarah",
      name: "Junior Clinic",
      slug: "junior-clinic",
      description: "Small-group junior clinics for ages 8–16. Games, fundamentals, and a clear next step for each player.",
      priceCents: 4500,
      durationMinutes: 60,
      mode: "in_person",
      location: "Practice facility",
      bookingUrl: "https://calendly.com/desertfairways/junior",
      ctaLabel: "Book a junior clinic",
      featured: false,
      bestFor: ["junior", "kids", "beginner"],
      sortOrder: 2,
    }),
  ];

  const theme = defaultTheme("Desert Fairways", "golf_course");

  return {
    organization: {
      id: COURSE_DEMO_ORG_ID,
      name: "Desert Fairways Golf Club",
      slug: COURSE_DEMO_PUBLIC_ID,
      type: "golf_course",
      courseCount: 2,
      accessType: "public",
      conversionGoals: ["tee_time_click", "membership_lead", "tournament_lead", "lesson_lead"],
      createdAt: now,
    },
    coach: {
      id: COURSE_DEMO_COACH_ID,
      organizationId: COURSE_DEMO_ORG_ID,
      name: "Desert Fairways Golf Club",
      businessName: "Desert Fairways Golf Club",
      email: "proshop@desertfairways.example",
      phone: "+1 520 555 0142",
      website: origin,
      location: "Tucson, Arizona",
      timezone: "America/Phoenix",
      title: "Public 36-hole golf club",
      credentials: [],
      bio: "Desert Fairways is a public 36-hole golf club in Tucson with a championship North Course, a walkable South Course, a full practice facility, and a teaching staff.",
      philosophy: "Give golfers a straight answer, then help them book a tee time, a lesson, or a conversation with the club.",
      teachingFocus: ["Beginner lessons", "Junior clinics", "Playing lessons"],
      socialLinks: {},
      bookingProvider: "custom",
      bookingUrl: `${origin}/tee-times`,
      notificationPrefs: DEFAULT_NOTIFICATION_PREFS,
    },
    locations: [
      {
        id: "loc_north",
        organizationId: COURSE_DEMO_ORG_ID,
        name: "North Course",
        address: "1100 Fairway Drive, Tucson, AZ",
        timezone: "America/Phoenix",
        phone: "+1 520 555 0142",
        website: origin,
        teeTimeProvider: "demo",
        bookingUrl: `${origin}/tee-times`,
        sortOrder: 0,
      },
      {
        id: "loc_south",
        organizationId: COURSE_DEMO_ORG_ID,
        name: "South Course",
        address: "1100 Fairway Drive, Tucson, AZ",
        timezone: "America/Phoenix",
        teeTimeProvider: "demo",
        bookingUrl: `${origin}/tee-times`,
        sortOrder: 1,
      },
    ],
    staff: [
      {
        id: "staff_mike",
        organizationId: COURSE_DEMO_ORG_ID,
        name: "Mike Smith",
        title: "PGA Professional",
        bio: "Mike has taught more than 10,000 lessons. He is the best first call for adult beginners and full-swing work.",
        specialties: ["beginner", "full swing", "driver"],
        bookingUrl: "https://calendly.com/desertfairways/mike",
        sortOrder: 0,
        active: true,
      },
      {
        id: "staff_sarah",
        organizationId: COURSE_DEMO_ORG_ID,
        name: "Sarah Jones",
        title: "Director of Instruction",
        bio: "Sarah runs the golf school and junior program. She is the right fit for juniors, short game, and new golfers who want a longer plan.",
        specialties: ["junior", "short game", "beginner"],
        bookingUrl: "https://calendly.com/desertfairways/sarah",
        sortOrder: 1,
        active: true,
      },
    ],
    announcements: [
      {
        id: "ann_range",
        organizationId: COURSE_DEMO_ORG_ID,
        title: "Range hours today",
        message: "The driving range will close at 4 PM today for maintenance. The putting green stays open.",
        startsAt: "2026-08-01T00:00:00.000Z",
        expiresAt: "2027-01-01T00:00:00.000Z",
        priority: 10,
        active: true,
      },
    ],
    bookingIntegrations: [
      {
        id: "int_demo",
        organizationId: COURSE_DEMO_ORG_ID,
        locationId: "loc_north",
        provider: "demo",
        status: "connected",
        configuration: { bookingUrl: `${origin}/tee-times` },
        supportsSearch: true,
        supportsDirectBooking: false,
        supportsBookingHandoff: true,
        lastSuccessAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ],
    services,
    widget: {
      id: COURSE_DEMO_WIDGET_ID,
      organizationId: COURSE_DEMO_ORG_ID,
      coachId: COURSE_DEMO_COACH_ID,
      publicId: COURSE_DEMO_PUBLIC_ID,
      slug: COURSE_DEMO_PUBLIC_ID,
      name: "Desert Fairways",
      status: "active",
      allowedOrigins: [],
      theme: {
        ...theme,
        assistantName: "Ask Desert Fairways",
        welcomeMessage: "Welcome to Desert Fairways. I can help with tee times, rates, memberships, events, and lessons. Tee times shown here are demo availability.",
        launcherText: "Ask Desert Fairways",
        suggestedQuestions: [
          "Any tee times tomorrow morning?",
          "How much is a membership?",
          "Do you have club rentals?",
          "Can I host a tournament?",
        ],
        quickActions: defaultQuickActions("golf_course"),
      },
      menu: defaultMenu("Desert Fairways", "golf_course").map((item) => ({
        ...item,
        enabled: ["ask", "tee_times", "course", "lessons", "events"].includes(item.key) || item.enabled,
      })),
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
    subscription: { organizationId: COURSE_DEMO_ORG_ID, plan: "pro", status: "active" },
    website: { url: origin, scanStatus: "scanned", lastScanAt: now, pagesFound: knowledgeSources.length },
    demo: true,
  };
}
