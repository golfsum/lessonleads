import { describe, expect, it } from "vitest";
import { plans, upgradePrompt } from "./plans";

describe("pricing plans", () => {
  it("keeps Free too small to live on and prices Solo as the working coach plan", () => {
    expect(plans.free.monthlyConversations).toBe(5);
    expect(plans.free.monthlyLeads).toBe(3);
    expect(plans.solo.priceCents).toBe(2900);
    expect(plans.solo.monthlyConversations).toBe(150);
    expect(plans.solo.monthlyLeads).toBeNull();
    expect(plans.pro.priceCents).toBe(7900);
    expect(plans.pro.monthlyConversations).toBe(1000);
  });

  it("sells the upgrade on leads, not tokens", () => {
    expect(upgradePrompt({ plan: "free", leadsThisMonth: 3, conversationsThisMonth: 2 })).toBe(
      "Your widget generated 3 leads this month. Keep it working for $29/month.",
    );
    expect(upgradePrompt({ plan: "free", leadsThisMonth: 0, conversationsThisMonth: 5 })).toBe(
      "Your widget used its 5 visitor conversations this month. Keep it working for $29/month.",
    );
    expect(upgradePrompt({ plan: "pro", leadsThisMonth: 40, conversationsThisMonth: 200 })).toBeNull();
  });
});
