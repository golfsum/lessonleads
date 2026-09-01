export type PlanFeature =
  | "customBranding"
  | "youtubeImport"
  | "swingUploads"
  | "analytics"
  | "advancedAnalytics"
  | "followUps"
  | "multipleCoaches"
  | "multipleServices"
  | "leadRouting"
  | "teamAccess"
  | "academyAnalytics";

type PlanDefinition<Id extends string> = {
  id: Id;
  name: string;
  monthlyPrice: number;
  conversationLimit: number;
  monthlyLeads: number | null;
  priceNote: string;
  description: string;
  features: string[];
} & Record<PlanFeature, boolean>;

function definePlan<const Definition extends PlanDefinition<string>>(input: Definition) {
  return {
    ...input,
    priceCents: input.monthlyPrice * 100,
    priceLabel: input.monthlyPrice === 0 ? "$0" : `$${input.monthlyPrice}`,
    monthlyConversations: input.conversationLimit,
  } as const;
}

/**
 * Coach-facing pricing lives here so marketing, checkout, usage, and the
 * public LessonLeads widget all read the same plan limits and feature set.
 * `priceCents` and `monthlyConversations` remain as compatibility aliases for
 * existing persistence and UI code; `monthlyPrice` and `conversationLimit`
 * are the canonical fields for new code.
 */
export const plans = {
  free: definePlan({
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    conversationLimit: 5,
    monthlyLeads: 3,
    priceNote: "No card required",
    customBranding: false,
    youtubeImport: false,
    swingUploads: false,
    analytics: false,
    advancedAnalytics: false,
    followUps: false,
    multipleCoaches: false,
    multipleServices: false,
    leadRouting: false,
    teamAccess: false,
    academyAnalytics: false,
    description: "Try LessonLeads on your website. Upgrade when golfers start talking.",
    features: [
      "Try LessonLeads on your website",
      "Up to 5 AI conversations / month",
      "Up to 3 leads",
      "Unlimited dashboard preview and testing",
      "LessonLeads branding",
    ],
  }),
  solo: definePlan({
    id: "solo",
    name: "Solo",
    monthlyPrice: 19,
    conversationLimit: 20,
    monthlyLeads: null,
    priceNote: "per month",
    customBranding: true,
    youtubeImport: false,
    swingUploads: false,
    analytics: true,
    advancedAnalytics: false,
    followUps: false,
    multipleCoaches: false,
    multipleServices: false,
    leadRouting: false,
    teamAccess: false,
    academyAnalytics: false,
    description: "For independent coaches who want more lesson inquiries from their existing website traffic.",
    features: [
      "AI assistant trained on your website",
      "Lead capture",
      "Custom branding",
      "Booking handoff",
      "Basic analytics",
      "20 AI conversations / month",
    ],
  }),
  pro: definePlan({
    id: "pro",
    name: "Pro",
    monthlyPrice: 39,
    conversationLimit: 50,
    monthlyLeads: null,
    priceNote: "per month",
    customBranding: true,
    youtubeImport: true,
    swingUploads: true,
    analytics: true,
    advancedAnalytics: true,
    followUps: true,
    multipleCoaches: false,
    multipleServices: false,
    leadRouting: false,
    teamAccess: false,
    academyAnalytics: false,
    description: "For coaches using videos and online content to actively generate students.",
    features: [
      "Everything in Solo",
      "YouTube knowledge",
      "Video recommendations",
      "Swing uploads",
      "Follow-up tools",
      "Conversion analytics",
      "50 AI conversations / month",
    ],
  }),
  academy: definePlan({
    id: "academy",
    name: "Academy",
    monthlyPrice: 59,
    conversationLimit: 100,
    monthlyLeads: null,
    priceNote: "per month",
    customBranding: true,
    youtubeImport: true,
    swingUploads: true,
    analytics: true,
    advancedAnalytics: true,
    followUps: true,
    multipleCoaches: true,
    multipleServices: true,
    leadRouting: true,
    teamAccess: true,
    academyAnalytics: true,
    description: "For golf academies and businesses with multiple coaches.",
    features: [
      "Everything in Pro",
      "Multiple coaches",
      "Multiple services",
      "Lead routing",
      "Team access",
      "Academy analytics",
      "100 AI conversations / month",
    ],
  }),
} as const;

export type PlanId = keyof typeof plans;
export type PaidPlanId = Exclude<PlanId, "free">;

const RANK: Record<PlanId, number> = { free: 0, solo: 1, pro: 2, academy: 3 };

export function isPlanId(value: string): value is PlanId {
  return value in plans;
}

export function isPaidPlanId(value: string): value is PaidPlanId {
  return value === "solo" || value === "pro" || value === "academy";
}

export function planRank(plan: string): number {
  return isPlanId(plan) ? RANK[plan] : 0;
}

export function hasPlanFeature(plan: string, feature: PlanFeature): boolean {
  return isPlanId(plan) ? plans[plan][feature] : false;
}

export function conversationLimit(plan: string): number {
  return isPlanId(plan) ? plans[plan].conversationLimit : plans.free.conversationLimit;
}

export function leadLimit(plan: string): number | null {
  return isPlanId(plan) ? plans[plan].monthlyLeads : plans.free.monthlyLeads;
}

/** Coach-facing copy when a plan reaches its cap. Never shown to visitors. */
export function upgradePrompt(input: { plan: string; leadsThisMonth: number; conversationsThisMonth: number }): string | null {
  if (input.plan === "solo" && input.conversationsThisMonth >= plans.solo.conversationLimit) {
    return "Your widget is at this month's conversation limit. Move to Pro for up to 50 AI conversations.";
  }
  if (input.plan === "solo" && input.conversationsThisMonth >= Math.ceil(plans.solo.conversationLimit * 0.85)) {
    return `You've used ${input.conversationsThisMonth} of your ${plans.solo.conversationLimit} monthly conversations. Consider Pro for up to ${plans.pro.conversationLimit} AI conversations.`;
  }
  if (input.plan === "pro" && input.conversationsThisMonth >= plans.pro.conversationLimit) {
    return "Your widget is at this month's conversation limit. Move to Academy for up to 100 AI conversations.";
  }
  if (input.plan === "pro" && input.conversationsThisMonth >= Math.ceil(plans.pro.conversationLimit * 0.85)) {
    return `You've used ${input.conversationsThisMonth} of your ${plans.pro.conversationLimit} monthly conversations. Consider Academy for up to ${plans.academy.conversationLimit} AI conversations.`;
  }
  if (input.plan !== "free") return null;

  if (plans.free.monthlyLeads !== null && input.leadsThisMonth >= plans.free.monthlyLeads) {
    const count = input.leadsThisMonth;
    return `Your widget generated ${count} lead${count === 1 ? "" : "s"} this month. Keep it working for $19/month.`;
  }
  if (input.conversationsThisMonth >= plans.free.conversationLimit) {
    if (input.leadsThisMonth > 0) {
      const count = input.leadsThisMonth;
      return `Your widget generated ${count} lead${count === 1 ? "" : "s"} this month. Keep it working for $19/month.`;
    }
    return "Your widget used its 5 AI conversations this month. Keep it working for $19/month.";
  }
  if (input.leadsThisMonth >= 2 || input.conversationsThisMonth >= 4) {
    const count = input.leadsThisMonth;
    if (count > 0) {
      return `Your widget generated ${count} lead${count === 1 ? "" : "s"} this month. Keep it working for $19/month.`;
    }
  }
  return null;
}

export const visitorConversationLimitMessage =
  "You've reached your monthly AI conversation allowance. Upgrade to keep your assistant active.";

export const visitorLeadLimitMessage =
  "This coach's inbox is full for now. You can still browse lessons or get in touch another way.";
