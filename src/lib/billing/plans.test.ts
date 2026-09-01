import { describe, expect, it } from "vitest";
import { plans, upgradePrompt } from "./plans";

describe("pricing plans", () => {
  it("keeps coach prices and limits in one configuration", () => {
    expect(plans.free.conversationLimit).toBe(5);
    expect(plans.free.monthlyLeads).toBe(3);
    expect(plans.solo.monthlyPrice).toBe(19);
    expect(plans.solo.priceCents).toBe(1900);
    expect(plans.solo.conversationLimit).toBe(20);
    expect(plans.solo.monthlyLeads).toBeNull();
    expect(plans.pro.monthlyPrice).toBe(39);
    expect(plans.pro.priceCents).toBe(3900);
    expect(plans.pro.conversationLimit).toBe(50);
    expect(plans.academy.monthlyPrice).toBe(59);
    expect(plans.academy.priceCents).toBe(5900);
    expect(plans.academy.conversationLimit).toBe(100);
  });

  it("warns before the paid plan limit and escalates at the cap", () => {
    expect(upgradePrompt({ plan: "solo", leadsThisMonth: 0, conversationsThisMonth: 17 })).toContain(
      "You've used 17 of your 20 monthly conversations.",
    );
    expect(upgradePrompt({ plan: "solo", leadsThisMonth: 0, conversationsThisMonth: 20 })).toContain("Move to Pro");
    expect(upgradePrompt({ plan: "pro", leadsThisMonth: 0, conversationsThisMonth: 43 })).toContain(
      "You've used 43 of your 50 monthly conversations.",
    );
    expect(upgradePrompt({ plan: "academy", leadsThisMonth: 0, conversationsThisMonth: 100 })).toBeNull();
  });

  it("keeps Free upgrade messaging tied to the current Solo price", () => {
    expect(upgradePrompt({ plan: "free", leadsThisMonth: 3, conversationsThisMonth: 2 })).toBe(
      "Your widget generated 3 leads this month. Keep it working for $19/month.",
    );
    expect(upgradePrompt({ plan: "free", leadsThisMonth: 0, conversationsThisMonth: 5 })).toBe(
      "Your widget used its 5 AI conversations this month. Keep it working for $19/month.",
    );
    expect(upgradePrompt({ plan: "pro", leadsThisMonth: 40, conversationsThisMonth: 40 })).toBeNull();
  });
});
