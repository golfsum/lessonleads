import { describe, expect, it } from "vitest";
import { describeIssue, extractProfileUpdates } from "./profile";

describe("conversation personalization", () => {
  it("picks up handicap, issue, and online preference without requiring a form", () => {
    const updates = extractProfileUpdates(
      "I'm a 14 handicap and I keep slicing my driver. Can I send you a video for an online lesson?",
    );
    expect(updates.handicap).toBe("14");
    expect(updates.primaryIssue).toMatch(/slic/i);
    expect(updates.focusArea).toBe("driver");
    expect(updates.coachingPreference).toBe("online");
  });

  it("turns captured miss words into readable coach-facing phrases", () => {
    expect(describeIssue("slicing")).toBe("a slice");
    expect(describeIssue("hook")).toBe("a hook");
  });
});
