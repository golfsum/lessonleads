import { describe, expect, it } from "vitest";
import { retrieveChunks } from "./retrieval";
import type { KnowledgeChunk } from "@/lib/domain/types";

function chunk(overrides: Partial<KnowledgeChunk> & Pick<KnowledgeChunk, "id" | "title" | "content" | "sourceType">): KnowledgeChunk {
  return {
    organizationId: "org_a",
    coachId: "coach_a",
    sourceId: "src_a",
    position: 0,
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("coach-scoped retrieval", () => {
  it("ranks FAQ and manual knowledge above a loosely related blog post", () => {
    const chunks = [
      chunk({
        id: "c1",
        sourceType: "website_page",
        title: "Course conditions",
        content: "The driving range is open daily and carts are available after noon.",
      }),
      chunk({
        id: "c2",
        sourceType: "faq",
        title: "Online lessons",
        content: "Yes, Mike offers online swing analysis. Upload a driver or iron video and he sends notes within 48 hours.",
      }),
      chunk({
        id: "c3",
        sourceType: "manual",
        title: "Junior policy",
        content: "Junior lessons are available for golfers ages 8 and older. A parent is welcome to watch.",
      }),
    ];

    const online = retrieveChunks("Do you offer online lessons?", chunks, 3);
    expect(online[0]?.chunk.id).toBe("c2");

    const juniors = retrieveChunks("Do you teach juniors?", chunks, 3);
    expect(juniors[0]?.chunk.id).toBe("c3");
  });

  it("returns nothing when the coach's knowledge does not contain the answer", () => {
    const chunks = [
      chunk({
        id: "c1",
        sourceType: "website_page",
        title: "About",
        content: "Mike Smith is a PGA professional based in Tucson who teaches a simple, repeatable swing.",
      }),
    ];
    expect(retrieveChunks("What is the cancellation policy?", chunks)).toEqual([]);
  });
});
