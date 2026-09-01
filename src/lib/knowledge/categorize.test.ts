import { describe, expect, it } from "vitest";
import { categorizeKnowledgePage } from "./categorize";

describe("categorizeKnowledgePage", () => {
  it("labels rates, membership, and events from URL patterns", () => {
    expect(categorizeKnowledgePage({ url: "https://club.example/rates" })).toEqual({ category: "rates", volatility: "frequently_changing" });
    expect(categorizeKnowledgePage({ url: "https://club.example/membership" })).toEqual({ category: "membership", volatility: "frequently_changing" });
    expect(categorizeKnowledgePage({ url: "https://club.example/tournaments" })).toEqual({ category: "events", volatility: "frequently_changing" });
    expect(categorizeKnowledgePage({ url: "https://club.example/about" })).toEqual({ category: "course", volatility: "static" });
  });
});
