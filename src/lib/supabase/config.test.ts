import { describe, expect, it } from "vitest";
import { supabaseProjectUrl } from "./config";

describe("supabaseProjectUrl", () => {
  it("keeps the project origin", () => {
    expect(supabaseProjectUrl("https://abc.supabase.co")).toBe("https://abc.supabase.co");
  });

  it("strips /rest/v1 pasted from the API docs", () => {
    expect(supabaseProjectUrl("https://abc.supabase.co/rest/v1/")).toBe("https://abc.supabase.co");
  });

  it("returns empty for missing or malformed values", () => {
    expect(supabaseProjectUrl("")).toBe("");
    expect(supabaseProjectUrl("not a url")).toBe("");
  });
});
