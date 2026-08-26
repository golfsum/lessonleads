import { describe, expect, it } from "vitest";
import { accumulateIntent, scoreMessageIntent } from "./intent";

describe("lead intent scoring", () => {
  it("scores buying signals without treating every chat as high intent", () => {
    expect(scoreMessageIntent("hello")).toBeLessThan(10);
    expect(scoreMessageIntent("How much are lessons?")).toBeGreaterThanOrEqual(25);
    expect(scoreMessageIntent("Can I upload my swing?")).toBeGreaterThanOrEqual(30);
  });

  it("accumulates across a conversation and maps to low/medium/high bands", () => {
    const first = accumulateIntent(0, "Why do I slice my driver?");
    expect(first.level).toBe("low");
    const second = accumulateIntent(first.score, "How much is the online swing analysis?");
    const third = accumulateIntent(second.score, "Can I book a lesson this weekend?");
    expect(third.score).toBeGreaterThanOrEqual(70);
    expect(third.level).toBe("high");
    expect(accumulateIntent(95, "How much are lessons?").score).toBe(100);
  });
});
