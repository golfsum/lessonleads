export const plans = {
  free: {
    id: "free" as const,
    name: "Free",
    priceCents: 0,
    priceLabel: "$0",
    priceNote: "No card required",
    monthlyConversations: 5,
    monthlyLeads: 3,
    customBranding: false,
    youtubeImport: false,
    swingUploads: false,
    analytics: false,
    followUps: false,
    description: "Try LessonLeads on your website. Upgrade when golfers start talking.",
    features: [
      "Try LessonLeads on your website",
      "Up to 5 visitor conversations / month",
      "Up to 3 leads",
      "Unlimited dashboard preview and testing",
      "LessonLeads branding",
    ],
  },
  solo: {
    id: "solo" as const,
    name: "Solo",
    priceCents: 2900,
    priceLabel: "$29",
    priceNote: "per month",
    monthlyConversations: 150,
    monthlyLeads: null,
    customBranding: true,
    youtubeImport: false,
    swingUploads: false,
    analytics: false,
    followUps: false,
    description: "For the independent coach whose site should produce students every month.",
    features: [
      "Up to 150 visitor conversations / month",
      "Unlimited leads",
      "Your branding, no LessonLeads footer",
      "Website knowledge",
      "Booking links to the tools you already use",
    ],
  },
  pro: {
    id: "pro" as const,
    name: "Pro",
    priceCents: 7900,
    priceLabel: "$79",
    priceNote: "per month",
    monthlyConversations: 1000,
    monthlyLeads: null,
    customBranding: true,
    youtubeImport: true,
    swingUploads: true,
    analytics: true,
    followUps: true,
    description: "For coaches who want YouTube, swing uploads, follow-ups, and the full funnel.",
    features: [
      "Up to 1,000 visitor conversations / month",
      "Unlimited leads",
      "YouTube import and video recommendations",
      "Swing upload funnel",
      "Follow-up tools",
      "Conversion analytics",
    ],
  },
} as const;

export type PlanId = keyof typeof plans;

const RANK: Record<PlanId, number> = { free: 0, solo: 1, pro: 2 };

export function isPlanId(value: string): value is PlanId {
  return value in plans;
}

export function planRank(plan: string): number {
  return isPlanId(plan) ? RANK[plan] : 0;
}

export function hasPlanFeature(plan: string, feature: "customBranding" | "youtubeImport" | "swingUploads" | "analytics" | "followUps"): boolean {
  return isPlanId(plan) ? plans[plan][feature] : false;
}

export function conversationLimit(plan: string): number {
  return isPlanId(plan) ? plans[plan].monthlyConversations : plans.free.monthlyConversations;
}

export function leadLimit(plan: string): number | null {
  return isPlanId(plan) ? plans[plan].monthlyLeads : plans.free.monthlyLeads;
}

/** Coach-facing copy when a Free (or limited) plan hits its cap. Never shown to visitors. */
export function upgradePrompt(input: { plan: string; leadsThisMonth: number; conversationsThisMonth: number }): string | null {
  if (input.plan !== "free") {
    if (input.plan === "solo" && input.conversationsThisMonth >= plans.solo.monthlyConversations) {
      return "Your widget is at this month's conversation limit. Move to Pro for up to 1,000 visitor conversations.";
    }
    return null;
  }
  if (input.leadsThisMonth >= plans.free.monthlyLeads) {
    const count = input.leadsThisMonth;
    return `Your widget generated ${count} lead${count === 1 ? "" : "s"} this month. Keep it working for $29/month.`;
  }
  if (input.conversationsThisMonth >= plans.free.monthlyConversations) {
    if (input.leadsThisMonth > 0) {
      const count = input.leadsThisMonth;
      return `Your widget generated ${count} lead${count === 1 ? "" : "s"} this month. Keep it working for $29/month.`;
    }
    return "Your widget used its 5 visitor conversations this month. Keep it working for $29/month.";
  }
  if (input.leadsThisMonth >= 2 || input.conversationsThisMonth >= 4) {
    const count = input.leadsThisMonth;
    if (count > 0) {
      return `Your widget generated ${count} lead${count === 1 ? "" : "s"} this month. Keep it working for $29/month.`;
    }
  }
  return null;
}

export const visitorConversationLimitMessage =
  "This assistant has reached its monthly limit. You can still browse lessons or get in touch with the coach.";

export const visitorLeadLimitMessage =
  "This coach's inbox is full for now. You can still browse lessons or get in touch another way.";
