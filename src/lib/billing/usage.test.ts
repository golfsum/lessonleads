import { describe, expect, it } from "vitest";
import type { WorkspaceData } from "@/lib/domain/types";
import { isConversationSessionActive, usageState, usageThisMonth } from "./usage";

function workspace(events: WorkspaceData["events"], plan: WorkspaceData["subscription"]["plan"] = "solo") {
  return {
    organization: { id: "org", name: "Coach", slug: "coach", createdAt: "2026-08-01T00:00:00.000Z" },
    coach: {} as WorkspaceData["coach"],
    services: [], widget: {} as WorkspaceData["widget"], leads: [], conversations: [],
    knowledgeSources: [], knowledgeChunks: [], faqs: [], contentItems: [], swingUploads: [], events,
    subscription: { organizationId: "org", plan, status: "active" }, website: { scanStatus: "never", pagesFound: 0 }, demo: true,
  } as WorkspaceData;
}

describe("conversation usage", () => {
  it("counts one session once even when duplicate start events exist", () => {
    const occurredAt = "2026-08-15T12:00:00.000Z";
    const events = [
      { id: "1", organizationId: "org", widgetId: "widget", name: "conversation_started" as const, sessionId: "s1", conversationId: "c1", occurredAt },
      { id: "2", organizationId: "org", widgetId: "widget", name: "conversation_started" as const, sessionId: "s1", conversationId: "c1", occurredAt },
      { id: "3", organizationId: "org", widgetId: "widget", name: "conversation_started" as const, sessionId: "s2", occurredAt },
    ];
    expect(usageThisMonth(workspace(events), new Date("2026-08-31T00:00:00.000Z")).conversations).toBe(2);
  });

  it("exposes a reset date and near-limit state", () => {
    const events = Array.from({ length: 17 }, (_, index) => ({
      id: String(index), organizationId: "org", widgetId: "widget", name: "conversation_started" as const,
      sessionId: `s${index}`, conversationId: `c${index}`, occurredAt: "2026-08-15T12:00:00.000Z",
    }));
    const state = usageState(workspace(events), new Date("2026-08-31T00:00:00.000Z"));
    expect(state.nearConversationLimit).toBe(true);
    expect(state.resetAt).toBe("2026-09-01T00:00:00.000Z");
    expect(state.prompt).toContain("17 of your 20");
  });

  it("expires a persisted conversation after inactivity or session change", () => {
    const conversation = { sessionId: "s1", lastMessageAt: "2026-08-31T00:00:00.000Z" };
    expect(isConversationSessionActive(conversation, "s1", Date.parse("2026-08-31T00:29:59.000Z"))).toBe(true);
    expect(isConversationSessionActive(conversation, "s1", Date.parse("2026-08-31T00:30:01.000Z"))).toBe(false);
    expect(isConversationSessionActive(conversation, "s2", Date.parse("2026-08-31T00:01:00.000Z"))).toBe(false);
  });
});
