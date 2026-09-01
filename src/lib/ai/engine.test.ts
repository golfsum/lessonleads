import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { toPublicWidget } from "@/lib/data/mappers";
import { buildSiteWorkspace } from "@/lib/site-widget/data";
import type { Conversation } from "@/lib/domain/types";
import { sortServicesByPrice } from "@/lib/domain/format";
import { respond, type EngineInput } from "./engine";

function siteInput(message: string): EngineInput {
  const workspace = buildSiteWorkspace();
  const widget = toPublicWidget(workspace);
  const conversation: Conversation = {
    id: "conversation_test",
    organizationId: workspace.organization.id,
    widgetId: workspace.widget.id,
    visitorId: "visitor_test",
    sessionId: "session_test",
    messages: [],
    profile: {},
    intentScore: 0,
    intentLevel: "low",
    startedAt: "2026-08-31T00:00:00.000Z",
    lastMessageAt: "2026-08-31T00:00:00.000Z",
  };
  return {
    message,
    conversation,
    leadCaptured: false,
    coach: widget.coach,
    assistantName: widget.widget.theme.assistantName,
    services: widget.services,
    contentItems: widget.contentItems,
    faqs: widget.faqs,
    chunks: workspace.knowledgeChunks,
    suggestedQuestions: widget.widget.theme.suggestedQuestions,
  };
}

const siteQuestions = [
  "How does LessonLeads work?",
  "What's included on each plan?",
  "Will it work with Calendly or CoachNow?",
  "How do I put this on my site?",
];

describe("LessonLeads widget defaults", () => {
  beforeEach(() => vi.stubEnv("OPENAI_API_KEY", ""));
  afterEach(() => vi.unstubAllEnvs());

  it.each(siteQuestions)("answers the default question: %s", async (question) => {
    const result = await respond(siteInput(question));
    expect(result.content).not.toContain("I don't see that in LessonLeads yet");
    expect(result.content.trim()).not.toHaveLength(0);
  });

  it("shows the unique widget ID in the installation example", async () => {
    const result = await respond(siteInput("How do I put this on my site?"));

    expect(result.content).toContain("unique public widget ID tied to your LessonLeads workspace");
    expect(result.content).toContain(
      '<script src="https://lessonleads.com/widget.js" data-coach="YOUR_UNIQUE_WIDGET_ID" async></script>',
    );
    expect(result.content).toContain("Your actual ID replaces YOUR_UNIQUE_WIDGET_ID");
  });

  it.each(siteQuestions)("keeps follow-up questions product-specific after: %s", async (question) => {
    const result = await respond(siteInput(question));

    expect(result.suggestedReplies).not.toContain(question);
    expect(result.suggestedReplies.every((reply) => siteQuestions.includes(reply))).toBe(true);
    expect(result.suggestedReplies.join(" ")).not.toMatch(/\b(?:lesson|swing|online coaching)\b/i);
  });

  it("preserves golf follow-ups for client coach widgets", async () => {
    const input = siteInput("Do you offer junior lessons?");
    input.coach = {
      ...input.coach,
      name: "Mike Doran",
      businessName: "Coach Mike Golf",
    };
    input.faqs = [
      {
        id: "faq_client_juniors",
        organizationId: "org_client",
        question: "Do you offer junior lessons?",
        answer: "Yes. Mike offers junior lessons.",
        enabled: true,
        sortOrder: 0,
      },
    ];

    const result = await respond(input);

    expect(result.suggestedReplies).toEqual(["Which lesson is right for me?", "Can I upload my swing?"]);
  });

  it("answers plan inclusions in ascending price order", async () => {
    const result = await respond(siteInput("What's included on each plan?"));
    expect(result.content).toContain("Academy");
    expect(result.content.indexOf("$0")).toBeLessThan(result.content.indexOf("$19/mo"));
    expect(result.content.indexOf("$19/mo")).toBeLessThan(result.content.indexOf("$39/mo"));
    expect(result.content.indexOf("$39/mo")).toBeLessThan(result.content.indexOf("$59/mo"));
  });

  it("sorts the plans section by lowest price", () => {
    const workspace = buildSiteWorkspace();
    const ordered = sortServicesByPrice([...workspace.services].reverse());
    expect(ordered.map((service) => service.name)).toEqual(["Free", "Solo", "Pro", "Academy"]);
  });
});
