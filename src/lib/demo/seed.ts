import type {
  ChatMessage,
  ContentItem,
  Conversation,
  FaqItem,
  KnowledgeChunk,
  KnowledgeSource,
  Lead,
  LessonWidget,
  Service,
  SwingUpload,
  WidgetEvent,
  WorkspaceData,
} from "@/lib/domain/types";

const now = () => new Date().toISOString();
const daysAgo = (days: number, hours = 0) => new Date(Date.now() - days * 86_400_000 - hours * 3_600_000).toISOString();

const ORG_ID = "org_desert_fairways";
const COACH_ID = "coach_mike_smith";
const WIDGET_ID = "widget_mike_smith";

function chunksFor(source: { id: string; type: KnowledgeSource["type"]; title: string; url?: string }, contents: string[], category?: string): KnowledgeChunk[] {
  return contents.map((content, index) => ({
    id: `${source.id}_chunk_${index}`,
    organizationId: ORG_ID,
    coachId: COACH_ID,
    sourceId: source.id,
    sourceType: source.type,
    title: source.title,
    url: source.url,
    category,
    content,
    position: index,
    updatedAt: daysAgo(6),
  }));
}

export function createDemoWorkspace(): WorkspaceData {
  const services: Service[] = [
    {
      id: "svc_swing_analysis",
      organizationId: ORG_ID,
      coachId: COACH_ID,
      name: "30-Minute Online Swing Analysis",
      slug: "online-swing-analysis",
      description: "Upload your swing and get personalized feedback from Mike within 48 hours, including drills matched to your exact miss.",
      priceCents: 7900,
      durationMinutes: 30,
      mode: "online",
      bookingUrl: "https://calendly.com/mikesmithgolf/swing-analysis",
      ctaLabel: "Book Swing Analysis",
      featured: true,
      bestFor: ["slice", "video review", "remote golfers", "driver"],
      active: true,
      sortOrder: 1,
    },
    {
      id: "svc_private_lesson",
      organizationId: ORG_ID,
      coachId: COACH_ID,
      name: "60-Minute Private Lesson",
      slug: "private-lesson",
      description: "One-on-one lesson at Desert Fairways Golf Club. Video analysis, a clear priority to work on, and take-home drills.",
      priceCents: 12000,
      durationMinutes: 60,
      mode: "in_person",
      location: "Desert Fairways Golf Club, Tucson",
      bookingUrl: "https://calendly.com/mikesmithgolf/private-lesson",
      ctaLabel: "Book a Lesson",
      featured: false,
      bestFor: ["full swing", "irons", "fundamentals", "beginner"],
      active: true,
      sortOrder: 2,
    },
    {
      id: "svc_playing_lesson",
      organizationId: ORG_ID,
      coachId: COACH_ID,
      name: "9-Hole Playing Lesson",
      slug: "playing-lesson",
      description: "Take your game to the course. Course management, club selection, and scoring strategy over nine holes with Mike.",
      priceCents: 22000,
      durationMinutes: 150,
      mode: "in_person",
      location: "Desert Fairways Golf Club, Tucson",
      ctaLabel: "Book Playing Lesson",
      featured: false,
      bestFor: ["course management", "scoring", "strategy"],
      active: true,
      sortOrder: 3,
    },
    {
      id: "svc_junior_lesson",
      organizationId: ORG_ID,
      coachId: COACH_ID,
      name: "Junior Lesson (45 min)",
      slug: "junior-lesson",
      description: "Fun, fundamentals-first coaching for golfers ages 8-17. Parents welcome to watch.",
      priceCents: 6500,
      durationMinutes: 45,
      mode: "in_person",
      location: "Desert Fairways Golf Club, Tucson",
      ctaLabel: "Book Junior Lesson",
      featured: false,
      bestFor: ["junior", "kids", "beginner"],
      active: true,
      sortOrder: 4,
    },
    {
      id: "svc_monthly_coaching",
      organizationId: ORG_ID,
      coachId: COACH_ID,
      name: "Monthly Online Coaching",
      slug: "monthly-coaching",
      description: "Ongoing remote coaching: unlimited swing uploads, monthly video calls, and a practice plan that adapts as you improve.",
      priceCents: null,
      priceLabel: "$199/month",
      durationMinutes: null,
      mode: "online",
      ctaLabel: "Start Monthly Coaching",
      featured: false,
      bestFor: ["committed golfers", "remote", "practice plan"],
      active: true,
      sortOrder: 5,
    },
  ];

  const widget: LessonWidget = {
    id: WIDGET_ID,
    organizationId: ORG_ID,
    coachId: COACH_ID,
    publicId: "demo-mike",
    slug: "mike-smith-golf",
    name: "Mike Smith Golf Widget",
    status: "active",
    allowedOrigins: [],
    theme: {
      assistantName: "Ask Mike",
      welcomeMessage: "Hey, I'm Mike's coaching assistant. Tell me what you're struggling with and I'll point you in the right direction.",
      launcherText: "Ask Coach Mike",
      launcherIcon: "golf",
      position: "bottom_right",
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
    },
    menu: [
      { id: "menu_ask", key: "ask", title: "Ask Mike", icon: "chat", enabled: true, sortOrder: 1 },
      { id: "menu_lessons", key: "lessons", title: "Lessons", icon: "flag", enabled: true, sortOrder: 2 },
      { id: "menu_videos", key: "videos", title: "Videos", icon: "video", enabled: true, sortOrder: 3 },
      { id: "menu_swing", key: "swing", title: "Swing Review", icon: "upload", enabled: true, sortOrder: 4 },
      { id: "menu_coach", key: "coach", title: "About Mike", icon: "person", enabled: true, sortOrder: 5 },
      { id: "menu_faq", key: "faq", title: "FAQ", icon: "question", enabled: false, sortOrder: 6 },
      { id: "menu_contact", key: "contact", title: "Contact", icon: "mail", enabled: false, sortOrder: 7 },
    ],
    defaultSectionKey: "ask",
    createdAt: daysAgo(30),
    updatedAt: daysAgo(2),
  };

  const sources: KnowledgeSource[] = [
    { id: "src_home", organizationId: ORG_ID, coachId: COACH_ID, type: "website_page", title: "Home", url: "https://mikesmithgolf.example/", status: "synced", includeInAi: true, lastSyncedAt: daysAgo(6), createdAt: daysAgo(30), updatedAt: daysAgo(6) },
    { id: "src_about", organizationId: ORG_ID, coachId: COACH_ID, type: "website_page", title: "About Mike", url: "https://mikesmithgolf.example/about", status: "synced", includeInAi: true, lastSyncedAt: daysAgo(6), createdAt: daysAgo(30), updatedAt: daysAgo(6) },
    { id: "src_lessons", organizationId: ORG_ID, coachId: COACH_ID, type: "website_page", title: "Private Lessons", url: "https://mikesmithgolf.example/lessons", status: "synced", includeInAi: true, lastSyncedAt: daysAgo(6), createdAt: daysAgo(30), updatedAt: daysAgo(6) },
    { id: "src_slice_article", organizationId: ORG_ID, coachId: COACH_ID, type: "website_page", title: "How to Fix Your Slice", url: "https://mikesmithgolf.example/blog/fix-your-slice", status: "synced", includeInAi: true, lastSyncedAt: daysAgo(6), createdAt: daysAgo(28), updatedAt: daysAgo(6) },
    { id: "src_putting_article", organizationId: ORG_ID, coachId: COACH_ID, type: "website_page", title: "Putting Fundamentals", url: "https://mikesmithgolf.example/blog/putting-fundamentals", status: "synced", includeInAi: true, lastSyncedAt: daysAgo(6), createdAt: daysAgo(28), updatedAt: daysAgo(6) },
    { id: "src_faq", organizationId: ORG_ID, coachId: COACH_ID, type: "faq", title: "FAQ", url: "https://mikesmithgolf.example/faq", status: "synced", includeInAi: true, lastSyncedAt: daysAgo(6), createdAt: daysAgo(30), updatedAt: daysAgo(6) },
    { id: "src_manual_juniors", organizationId: ORG_ID, coachId: COACH_ID, type: "manual", title: "Junior program details", status: "synced", includeInAi: true, lastSyncedAt: daysAgo(10), createdAt: daysAgo(10), updatedAt: daysAgo(10) },
  ];

  const knowledgeChunks: KnowledgeChunk[] = [
    ...chunksFor({ id: "src_home", type: "website_page", title: "Home", url: "https://mikesmithgolf.example/" }, [
      "Mike Smith Golf helps golfers in Tucson build repeatable swings and lower scores without overcomplicating the game. Private lessons, online swing analysis, playing lessons, and junior coaching at Desert Fairways Golf Club.",
    ]),
    ...chunksFor({ id: "src_about", type: "website_page", title: "About Mike", url: "https://mikesmithgolf.example/about" }, [
      "Mike Smith is a PGA Professional with over 15 years of teaching experience in Tucson, Arizona. He has given more than 10,000 lessons to golfers of every level, from first-timers to college players. Mike believes most golfers are one or two priorities away from their best golf, not a full swing rebuild.",
      "Mike's teaching philosophy is simple: find the one thing that matters most in your swing, fix it with a feel you can repeat under pressure, and build from there. He avoids jargon and never gives a student more than one priority at a time.",
    ]),
    ...chunksFor({ id: "src_lessons", type: "website_page", title: "Private Lessons", url: "https://mikesmithgolf.example/lessons" }, [
      "Private lessons with Mike start with a short interview about your game, then video of your swing from two angles. Mike identifies the single highest-impact change and gives you a drill you can take to the range that day. Every student leaves with video notes.",
      "Not in Tucson? Mike's online swing analysis works the same way: upload two angles of your swing, and Mike sends back a personal video breakdown with your priority fix and matched drills within 48 hours.",
    ]),
    ...chunksFor({ id: "src_slice_article", type: "website_page", title: "How to Fix Your Slice", url: "https://mikesmithgolf.example/blog/fix-your-slice" }, [
      "A slice almost always comes from a clubface that is open relative to your swing path at impact. Before changing your swing, check ball flight: if the ball starts straight and curves right, your face is open to the path. If it starts right and stays right, the path itself is the bigger issue.",
      "The fastest slice fix I teach: strengthen your lead-hand grip so you can see two and a half knuckles at address, then feel like the toe of the club beats the heel through impact. Most slicers try to steer the face square, which slows the club down and leaves it open. Let the face rotate.",
      "Drill: place an alignment stick just outside the ball on your target line. To miss the stick you have to swing more from the inside, which shallows the path and helps the face square up. Ten slow swings, then three at full speed. The ball should start right of your target and draw back.",
    ], "Driver"),
    ...chunksFor({ id: "src_putting_article", type: "website_page", title: "Putting Fundamentals", url: "https://mikesmithgolf.example/blog/putting-fundamentals" }, [
      "Three-putts almost always come from poor speed, not poor line. On putts over 20 feet, your only goal is to leave the ball inside a three-foot circle around the hole. Distance control comes from the length of your stroke, never from hitting at the ball harder.",
      "The ladder drill fixes speed fast: putt to the fringe from 20, 30, and 40 feet, trying to finish each ball within a putter length of the previous one. Five minutes before every round is enough to calibrate the greens that day.",
    ], "Putting"),
    ...chunksFor({ id: "src_manual_juniors", type: "manual", title: "Junior program details" }, [
      "Junior lessons are available for ages 8 and older. Sessions are 45 minutes and focus on fun and fundamentals: grip, setup, and making confident contact. Parents are welcome to watch. Junior group clinics run in summer; ask Mike for the current schedule.",
    ]),
  ];

  const faqs: FaqItem[] = [
    { id: "faq_online", organizationId: ORG_ID, sourceId: "src_faq", question: "Do you offer online lessons?", answer: "Yes. Mike works with golfers everywhere through the 30-Minute Online Swing Analysis and Monthly Online Coaching. You upload your swing from your phone and get a personal video breakdown back within 48 hours.", enabled: true, sortOrder: 1 },
    { id: "faq_location", organizationId: ORG_ID, sourceId: "src_faq", question: "Where do lessons take place?", answer: "In-person lessons are at Desert Fairways Golf Club in Tucson, Arizona. The teaching bay is next to the driving range; check in at the pro shop.", enabled: true, sortOrder: 2 },
    { id: "faq_juniors", organizationId: ORG_ID, sourceId: "src_faq", question: "Do you teach juniors?", answer: "Yes. Junior lessons are available for ages 8 and older, with 45-minute sessions focused on fun and fundamentals. Summer group clinics are also available.", enabled: true, sortOrder: 3 },
    { id: "faq_cancellation", organizationId: ORG_ID, sourceId: "src_faq", question: "What is your cancellation policy?", answer: "Lessons can be rescheduled or cancelled free of charge up to 24 hours in advance. Inside 24 hours, half the lesson fee applies.", enabled: true, sortOrder: 4 },
    { id: "faq_bring", organizationId: ORG_ID, sourceId: "src_faq", question: "What should I bring to my first lesson?", answer: "Just your clubs and comfortable shoes. Range balls and video are included. If you have a launch-monitor report or previous lesson notes, bring those too.", enabled: true, sortOrder: 5 },
  ];

  const contentItems: ContentItem[] = [
    {
      id: "vid_slice_fix",
      organizationId: ORG_ID,
      coachId: COACH_ID,
      type: "youtube",
      title: "Fix Your Driver Slice in 5 Minutes",
      description: "The grip and face-rotation fix Mike gives every slicer, plus the alignment-stick path drill.",
      url: "https://www.youtube.com/watch?v=demo-slice-fix",
      categories: ["Driver"],
      transcriptAvailable: true,
      includeInAi: true,
      active: true,
      sortOrder: 1,
      createdAt: daysAgo(25),
    },
    {
      id: "vid_three_putt",
      organizationId: ORG_ID,
      coachId: COACH_ID,
      type: "youtube",
      title: "Stop Three-Putting: The Ladder Drill",
      description: "Distance control is speed, not line. Calibrate your putting speed in five minutes with the ladder drill.",
      url: "https://www.youtube.com/watch?v=demo-ladder-drill",
      categories: ["Putting"],
      transcriptAvailable: true,
      includeInAi: true,
      active: true,
      sortOrder: 2,
      createdAt: daysAgo(24),
    },
    {
      id: "vid_chipping",
      organizationId: ORG_ID,
      coachId: COACH_ID,
      type: "youtube",
      title: "Chipping Basics: One Setup Change",
      description: "Stop chunking chips. Weight forward, ball back, handle at the lead thigh, and brush the turf.",
      url: "https://www.youtube.com/watch?v=demo-chipping",
      categories: ["Short Game"],
      transcriptAvailable: false,
      includeInAi: true,
      active: true,
      sortOrder: 3,
      createdAt: daysAgo(20),
    },
    {
      id: "vid_driver_setup",
      organizationId: ORG_ID,
      coachId: COACH_ID,
      type: "youtube",
      title: "Simple Driver Setup for More Distance",
      description: "Tee height, ball position, and spine tilt: the three setup keys for hitting up on the driver.",
      url: "https://www.youtube.com/watch?v=demo-driver-setup",
      categories: ["Driver"],
      transcriptAvailable: true,
      includeInAi: true,
      active: true,
      sortOrder: 4,
      createdAt: daysAgo(18),
    },
  ];

  const johnConversationMessages: ChatMessage[] = [
    { id: "msg_j1", conversationId: "conv_john", role: "visitor", content: "Why do I keep slicing my driver? It starts straight then curves way right.", createdAt: daysAgo(2, 5) },
    {
      id: "msg_j2",
      conversationId: "conv_john",
      role: "assistant",
      content: "Based on Mike's teaching: a slice almost always comes from a clubface that is open relative to your swing path at impact. Since your ball starts straight and curves right, your face is open to the path.\n\nThat's very close to what Mike covers in this video:",
      cards: [{ kind: "video", contentId: "vid_slice_fix", title: "Fix Your Driver Slice in 5 Minutes", url: "https://www.youtube.com/watch?v=demo-slice-fix" }],
      sources: [
        { sourceId: "src_slice_article", title: "How to Fix Your Slice", type: "website_page" },
        { sourceId: "vid_slice_fix", title: "Fix Your Driver Slice in 5 Minutes", type: "youtube_video" },
      ],
      createdAt: daysAgo(2, 5),
    },
    { id: "msg_j3", conversationId: "conv_john", role: "visitor", content: "I've been fighting this for six months. Can I send Mike a video of my swing?", createdAt: daysAgo(2, 5) },
    {
      id: "msg_j4",
      conversationId: "conv_john",
      role: "assistant",
      content: "Yes, you can upload your swing right here. Based on what you've described, Mike's 30-Minute Online Swing Analysis is probably the best fit ($79).",
      cards: [
        { kind: "swing_upload", prompt: "Upload your swing" },
        { kind: "service", serviceId: "svc_swing_analysis" },
        { kind: "capture", prompt: "Want me to save your details so Mike can follow up on your swing?" },
      ],
      createdAt: daysAgo(2, 5),
    },
  ];

  const conversations: Conversation[] = [
    {
      id: "conv_john",
      organizationId: ORG_ID,
      widgetId: WIDGET_ID,
      visitorId: "visitor_john",
      sessionId: "session_john",
      leadId: "lead_john",
      messages: johnConversationMessages,
      profile: { primaryIssue: "slicing", focusArea: "driver", handicap: "14", coachingPreference: "online" },
      intentScore: 82,
      intentLevel: "high",
      recommendedServiceId: "svc_swing_analysis",
      summary: "John is a 14-handicap golfer working on a slice with the driver. Interested in online coaching. Uploaded a swing video (Driver, high slice). Was shown \"Fix Your Driver Slice in 5 Minutes\". Recommended service: 30-Minute Online Swing Analysis ($79). 2 visitor messages in the conversation. Intent: High.",
      page: "https://mikesmithgolf.example/blog/fix-your-slice",
      referrer: "https://www.google.com/",
      utm: { source: "google", medium: "organic" },
      device: "mobile",
      startedAt: daysAgo(2, 6),
      lastMessageAt: daysAgo(2, 5),
    },
    {
      id: "conv_sarah",
      organizationId: ORG_ID,
      widgetId: WIDGET_ID,
      visitorId: "visitor_sarah",
      sessionId: "session_sarah",
      leadId: "lead_sarah",
      messages: [
        { id: "msg_s1", conversationId: "conv_sarah", role: "visitor", content: "I keep three-putting. How much are putting lessons?", createdAt: daysAgo(5, 2) },
        {
          id: "msg_s2",
          conversationId: "conv_sarah",
          role: "assistant",
          content: "Here's Mike's current lineup:\n\n30-Minute Online Swing Analysis — $79\n60-Minute Private Lesson — $120\n9-Hole Playing Lesson — $220\n\nBased on what you've told me, the 60-Minute Private Lesson is probably the best place to start.",
          cards: [{ kind: "service", serviceId: "svc_private_lesson" }],
          createdAt: daysAgo(5, 2),
        },
      ],
      profile: { primaryIssue: "three-putting", focusArea: "putting" },
      intentScore: 44,
      intentLevel: "medium",
      recommendedServiceId: "svc_private_lesson",
      summary: "Sarah is focused on putting, working on three-putting. Recommended service: 60-Minute Private Lesson ($120). 1 visitor message in the conversation. Intent: Medium.",
      page: "https://mikesmithgolf.example/",
      device: "desktop",
      startedAt: daysAgo(5, 3),
      lastMessageAt: daysAgo(5, 2),
    },
    {
      id: "conv_anon",
      organizationId: ORG_ID,
      widgetId: WIDGET_ID,
      visitorId: "visitor_anon1",
      sessionId: "session_anon1",
      messages: [
        { id: "msg_a1", conversationId: "conv_anon", role: "visitor", content: "What should I bring to a first lesson?", createdAt: daysAgo(1, 4) },
        {
          id: "msg_a2",
          conversationId: "conv_anon",
          role: "assistant",
          content: "Just your clubs and comfortable shoes. Range balls and video are included. If you have a launch-monitor report or previous lesson notes, bring those too.",
          sources: [{ sourceId: "src_faq", title: "What should I bring to my first lesson?", type: "faq" }],
          createdAt: daysAgo(1, 4),
        },
      ],
      profile: {},
      intentScore: 19,
      intentLevel: "low",
      page: "https://mikesmithgolf.example/lessons",
      device: "mobile",
      startedAt: daysAgo(1, 4),
      lastMessageAt: daysAgo(1, 4),
    },
  ];

  const leads: Lead[] = [
    {
      id: "lead_john",
      organizationId: ORG_ID,
      widgetId: WIDGET_ID,
      conversationId: "conv_john",
      visitorId: "visitor_john",
      firstName: "John",
      lastName: "Davis",
      email: "john.davis@example.com",
      phone: "+1 520 555 0148",
      consent: true,
      smsConsent: false,
      preferredContact: "email",
      status: "new",
      intentScore: 82,
      intentLevel: "high",
      interest: "Driver slice / online swing analysis",
      source: "floating",
      sessionId: "session_john",
      idempotencyKey: "demo_lead_john",
      bookingToken: "demo-booking-token-john",
      recommendedServiceId: "svc_swing_analysis",
      summary: conversations[0].summary,
      landingPage: "https://mikesmithgolf.example/blog/fix-your-slice",
      referrer: "https://www.google.com/",
      utm: { source: "google", medium: "organic" },
      createdAt: daysAgo(2, 5),
      updatedAt: daysAgo(2, 4),
      activity: [
        { id: "act_j1", type: "conversation", label: "Started a conversation", occurredAt: daysAgo(2, 6) },
        { id: "act_j2", type: "lead_captured", label: "Lead captured", occurredAt: daysAgo(2, 5) },
        { id: "act_j3", type: "swing_uploaded", label: "Swing video uploaded (Driver)", occurredAt: daysAgo(2, 4) },
      ],
    },
    {
      id: "lead_sarah",
      organizationId: ORG_ID,
      widgetId: WIDGET_ID,
      conversationId: "conv_sarah",
      visitorId: "visitor_sarah",
      firstName: "Sarah",
      lastName: "Kim",
      email: "sarah.kim@example.com",
      consent: true,
      smsConsent: false,
      status: "contacted",
      intentScore: 44,
      intentLevel: "medium",
      interest: "Putting / private lesson",
      source: "inline",
      sessionId: "session_sarah",
      idempotencyKey: "demo_lead_sarah",
      bookingToken: "demo-booking-token-sarah",
      bookingClickedAt: daysAgo(4, 20),
      recommendedServiceId: "svc_private_lesson",
      summary: conversations[1].summary,
      landingPage: "https://mikesmithgolf.example/",
      createdAt: daysAgo(5, 2),
      updatedAt: daysAgo(4, 8),
      activity: [
        { id: "act_s1", type: "conversation", label: "Started a conversation", occurredAt: daysAgo(5, 3) },
        { id: "act_s2", type: "lead_captured", label: "Lead captured", occurredAt: daysAgo(5, 2) },
        { id: "act_s3", type: "booking_clicked", label: "Booking link clicked", occurredAt: daysAgo(4, 20) },
        { id: "act_s4", type: "status_changed", label: "Status changed to contacted", occurredAt: daysAgo(4, 8) },
      ],
    },
    {
      id: "lead_tom",
      organizationId: ORG_ID,
      widgetId: WIDGET_ID,
      visitorId: "visitor_tom",
      firstName: "Tom",
      lastName: "Alvarez",
      email: "tom.alvarez@example.com",
      consent: false,
      smsConsent: false,
      status: "booked",
      intentScore: 58,
      intentLevel: "medium",
      interest: "Junior lessons for his son",
      source: "hosted",
      sessionId: "session_tom",
      idempotencyKey: "demo_lead_tom",
      bookingToken: "demo-booking-token-tom",
      bookingClickedAt: daysAgo(9, 1),
      recommendedServiceId: "svc_junior_lesson",
      createdAt: daysAgo(9, 3),
      updatedAt: daysAgo(7, 2),
      activity: [
        { id: "act_t1", type: "lead_captured", label: "Lead captured", occurredAt: daysAgo(9, 3) },
        { id: "act_t2", type: "booking_clicked", label: "Booking link clicked", occurredAt: daysAgo(9, 1) },
        { id: "act_t3", type: "status_changed", label: "Status changed to booked", occurredAt: daysAgo(7, 2) },
      ],
    },
  ];

  const swingUploads: SwingUpload[] = [
    {
      id: "swing_john",
      organizationId: ORG_ID,
      widgetId: WIDGET_ID,
      conversationId: "conv_john",
      leadId: "lead_john",
      visitorId: "visitor_john",
      fileName: "driver-swing.mp4",
      filePath: "demo/driver-swing.mp4",
      mimeType: "video/mp4",
      sizeBytes: 8_400_000,
      club: "Driver",
      typicalMiss: "High slice",
      handicap: "14",
      goal: "Hit a more controlled fade",
      createdAt: daysAgo(2, 4),
    },
  ];

  const events: WidgetEvent[] = [];
  let eventCounter = 0;
  const pushEvent = (name: WidgetEvent["name"], sessionId: string, occurredAt: string, extra?: Partial<WidgetEvent>) => {
    eventCounter += 1;
    events.push({
      id: `evt_${eventCounter}`,
      organizationId: ORG_ID,
      widgetId: WIDGET_ID,
      name,
      sessionId,
      occurredAt,
      ...extra,
    });
  };

  // Ambient traffic for a believable funnel this month.
  for (let index = 0; index < 34; index += 1) {
    const when = daysAgo((index % 14) + 1, index % 12);
    pushEvent("widget_view", `session_ambient_${index}`, when);
    if (index % 2 === 0) pushEvent("widget_open", `session_ambient_${index}`, when);
    if (index % 4 === 0) pushEvent("conversation_started", `session_ambient_${index}`, when);
    if (index % 4 === 0) pushEvent("message_sent", `session_ambient_${index}`, when);
    if (index % 8 === 0) pushEvent("video_viewed", `session_ambient_${index}`, when, { properties: { content_id: "vid_slice_fix" } });
  }

  pushEvent("widget_view", "session_john", daysAgo(2, 6));
  pushEvent("widget_open", "session_john", daysAgo(2, 6));
  pushEvent("conversation_started", "session_john", daysAgo(2, 6), { conversationId: "conv_john" });
  pushEvent("message_sent", "session_john", daysAgo(2, 5), { conversationId: "conv_john" });
  pushEvent("video_viewed", "session_john", daysAgo(2, 5), { conversationId: "conv_john", properties: { content_id: "vid_slice_fix" } });
  pushEvent("lead_capture_started", "session_john", daysAgo(2, 5), { conversationId: "conv_john" });
  pushEvent("lead_captured", "session_john", daysAgo(2, 5), { leadId: "lead_john", conversationId: "conv_john" });
  pushEvent("swing_upload_started", "session_john", daysAgo(2, 4), { leadId: "lead_john", conversationId: "conv_john" });
  pushEvent("swing_uploaded", "session_john", daysAgo(2, 4), { leadId: "lead_john", conversationId: "conv_john" });

  pushEvent("widget_view", "session_sarah", daysAgo(5, 3));
  pushEvent("widget_open", "session_sarah", daysAgo(5, 3));
  pushEvent("conversation_started", "session_sarah", daysAgo(5, 3), { conversationId: "conv_sarah" });
  pushEvent("message_sent", "session_sarah", daysAgo(5, 2), { conversationId: "conv_sarah" });
  pushEvent("service_viewed", "session_sarah", daysAgo(5, 2), { conversationId: "conv_sarah", properties: { service_id: "svc_private_lesson" } });
  pushEvent("lead_captured", "session_sarah", daysAgo(5, 2), { leadId: "lead_sarah", conversationId: "conv_sarah" });
  pushEvent("booking_clicked", "session_sarah", daysAgo(4, 20), { leadId: "lead_sarah", conversationId: "conv_sarah" });

  pushEvent("widget_view", "session_tom", daysAgo(9, 3));
  pushEvent("widget_open", "session_tom", daysAgo(9, 3));
  pushEvent("lead_captured", "session_tom", daysAgo(9, 3), { leadId: "lead_tom" });
  pushEvent("booking_clicked", "session_tom", daysAgo(9, 1), { leadId: "lead_tom" });

  pushEvent("widget_view", "session_anon1", daysAgo(1, 4));
  pushEvent("widget_open", "session_anon1", daysAgo(1, 4));
  pushEvent("conversation_started", "session_anon1", daysAgo(1, 4), { conversationId: "conv_anon" });
  pushEvent("message_sent", "session_anon1", daysAgo(1, 4), { conversationId: "conv_anon" });

  return {
    organization: { id: ORG_ID, name: "Mike Smith Golf", slug: "desert-fairways", createdAt: daysAgo(30) },
    coach: {
      id: COACH_ID,
      organizationId: ORG_ID,
      name: "Mike Smith",
      businessName: "Mike Smith Golf",
      email: "mike@mikesmithgolf.example",
      phone: "+1 520 555 0110",
      website: "https://mikesmithgolf.example",
      location: "Tucson, Arizona",
      timezone: "America/Phoenix",
      title: "PGA Professional",
      credentials: ["PGA Class A Professional", "15+ years teaching"],
      bio: "Mike has given more than 10,000 lessons to golfers of every level, from first-timers to college players, at Desert Fairways Golf Club in Tucson.",
      philosophy: "Most golfers are one or two priorities away from their best golf. Find the change that matters most, make it repeatable, and keep the game simple.",
      teachingFocus: ["Private lessons", "Online coaching", "Junior golf", "Playing lessons"],
      socialLinks: { youtube: "https://youtube.com/@CoachMikeGolf", instagram: "https://instagram.com/coachmikegolf" },
      bookingProvider: "calendly",
      bookingUrl: "https://calendly.com/mikesmithgolf",
      notificationPrefs: { newLead: true, highIntentLead: true, swingUpload: true, bookingClick: true, everyConversation: false },
    },
    services,
    widget,
    leads,
    conversations,
    knowledgeSources: sources,
    knowledgeChunks,
    faqs,
    contentItems,
    swingUploads,
    events,
    subscription: { organizationId: ORG_ID, plan: "pro", status: "active", currentPeriodEnd: daysAgo(-30) },
    website: { url: "https://mikesmithgolf.example", scanStatus: "scanned", lastScanAt: daysAgo(6), pagesFound: 6 },
    demo: true,
  };
}

export const demoSeedCreatedAt = now;
