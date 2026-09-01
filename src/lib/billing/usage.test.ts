import { describe, expect, it } from "vitest";
import { createDemoWorkspace } from "@/lib/demo/seed";
import { isConversationSessionActive, nextUsageResetAt, usageState, usageThisMonth } from "./usage";

describe("conversation usage", () => {
  it("counts conversation sessions once instead of counting messages", () => {
    const data = createDemoWorkspace();
    const now = new Date("2026-08-31T12:00:00.000Z");
    data.events = [
      {
        id: "start-1",
        organizationId: data.organization.id,
        widgetId: data.widget.id,
        name: "conversation_started",
        sessionId: "session-1",
        conversationId: "conversation-1",
        occurredAt: "2026-08-31T10:00:00.000Z",
      },
      {
        id: "message-1",
        organizationId: data.organization.id,
        widgetId: data.widget.id,
        name: "message_sent",
        sessionId: "session-1",
        conversationId: "conversation-1",
        occurredAt: "2026-08-31T10:05:00.000Z",
      },
      {
        id: "duplicate-start-1",
        organizationId: data.organization.id,
        widgetId: data.widget.id,
        name: "conversation_started",
        sessionId: "session-1",
        conversationId: "conversation-1",
        occurredAt: "2026-08-31T10:06:00.000Z",
      },
      {
        id: "start-2",
        organizationId: data.organization.id,
        widgetId: data.widget.id,
        name: "conversation_started",
        sessionId: "session-2",
        conversationId: "conversation-2",
        occurredAt: "2026-08-31T11:00:00.000Z",
      },
    ];

    expect(usageThisMonth(data, now).conversations).toBe(2);
    expect(usageState(data, now).conversations).toBe(2);
    expect(nextUsageResetAt(now)).toBe("2026-09-01T00:00:00.000Z");
  });

  it("ends a session after inactivity or when the browser session changes", () => {
    const conversation = { sessionId: "session-1", lastMessageAt: "2026-08-31T11:45:00.000Z" };
    expect(isConversationSessionActive(conversation, "session-1", Date.parse("2026-08-31T12:00:00.000Z"))).toBe(true);
    expect(isConversationSessionActive(conversation, "session-1", Date.parse("2026-08-31T12:16:00.000Z"))).toBe(false);
    expect(isConversationSessionActive(conversation, "session-2", Date.parse("2026-08-31T12:00:00.000Z"))).toBe(false);
  });
});
