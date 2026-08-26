import { describe, expect, it } from "vitest";
import { widgetOriginAllowed, isAllowedHost, normalizeDomain } from "./origins";

describe("widget origin allowlisting", () => {
  it("normalizes domains and strips protocol, www, and paths", () => {
    expect(normalizeDomain("https://www.CoachMikeGolf.com/lessons")).toBe("coachmikegolf.com");
  });

  it("allows any host when the coach has not locked domains", () => {
    expect(isAllowedHost("evil.example", [], "https://lessonleads.com")).toBe(true);
    expect(widgetOriginAllowed({ origin: "https://random.site", allowedOrigins: [] })).toBe(true);
  });

  it("always allows localhost and the LessonLeads app host", () => {
    expect(isAllowedHost("localhost", ["coachmikegolf.com"], "https://lessonleads.com")).toBe(true);
    expect(isAllowedHost("lessonleads.com", ["coachmikegolf.com"], "https://lessonleads.com")).toBe(true);
  });

  it("accepts the listed domain and its subdomains", () => {
    expect(isAllowedHost("coachmikegolf.com", ["coachmikegolf.com"])).toBe(true);
    expect(isAllowedHost("www.coachmikegolf.com", ["coachmikegolf.com"])).toBe(true);
    expect(isAllowedHost("book.coachmikegolf.com", ["coachmikegolf.com"])).toBe(true);
  });

  it("rejects a different website when domains are locked", () => {
    expect(isAllowedHost("stolen-widget.test", ["coachmikegolf.com"])).toBe(false);
    expect(
      widgetOriginAllowed({
        origin: "https://stolen-widget.test",
        page: "https://stolen-widget.test/lessons",
        allowedOrigins: ["coachmikegolf.com"],
        appUrl: "https://lessonleads.com",
      }),
    ).toBe(false);
  });

  it("uses the host page URL when the fetch origin is LessonLeads (iframe)", () => {
    expect(
      widgetOriginAllowed({
        origin: "https://lessonleads.com",
        page: "https://coachmikegolf.com/ask",
        allowedOrigins: ["coachmikegolf.com"],
        appUrl: "https://lessonleads.com",
      }),
    ).toBe(true);
    expect(
      widgetOriginAllowed({
        origin: "https://lessonleads.com",
        page: "https://stolen-widget.test/ask",
        allowedOrigins: ["coachmikegolf.com"],
        appUrl: "https://lessonleads.com",
      }),
    ).toBe(false);
  });
});
