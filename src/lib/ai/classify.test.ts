import { describe, expect, it } from "vitest";
import { classifyVisitorIntent } from "./classify";

describe("classifyVisitorIntent", () => {
  it("routes coach swing questions to swing help", () => {
    expect(classifyVisitorIntent("Why do I slice my driver?", "golf_coach")).toBe("swing_help");
  });

  it("routes course tee-time language to search instead of RAG", () => {
    expect(classifyVisitorIntent("Any tee times tomorrow morning?", "golf_course")).toBe("tee_time_search");
    expect(classifyVisitorIntent("I need a time Saturday around 9 for four players.", "golf_course")).toBe("tee_time_search");
    expect(classifyVisitorIntent("Anything after 3 PM today for two?", "golf_course")).toBe("tee_time_search");
  });

  it("does not treat coach lesson booking as a tee-time search", () => {
    expect(classifyVisitorIntent("Can I book a lesson this weekend?", "golf_coach")).not.toBe("tee_time_search");
  });

  it("routes membership and tournament questions on course widgets", () => {
    expect(classifyVisitorIntent("How much is a membership?", "golf_course")).toBe("membership");
    expect(classifyVisitorIntent("We're looking for somewhere to host a company golf event for about 60 people.", "golf_course")).toBe("tournament");
  });

  it("routes the built-in LessonLeads questions to factual answers", () => {
    expect(classifyVisitorIntent("How does LessonLeads work?", "golf_coach")).toBe("factual_business");
    expect(classifyVisitorIntent("What's included on each plan?", "golf_coach")).toBe("factual_business");
    expect(classifyVisitorIntent("Will it work with Calendly or CoachNow?", "golf_coach")).toBe("factual_business");
  });
});
