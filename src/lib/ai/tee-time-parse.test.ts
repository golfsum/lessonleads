import { describe, expect, it } from "vitest";
import { parseTeeTimeRequest } from "./tee-time-parse";

describe("parseTeeTimeRequest", () => {
  const now = new Date("2026-08-28T15:00:00");

  it("extracts tomorrow morning for four by default when foursome is implied", () => {
    const parsed = parseTeeTimeRequest("Any tee times tomorrow morning?", now);
    expect(parsed?.date).toBe("2026-08-29");
    expect(parsed?.timeMin).toBe("06:00");
    expect(parsed?.timeMax).toBe("11:30");
  });

  it("extracts Saturday around 9 for four players", () => {
    const parsed = parseTeeTimeRequest("I need a time Saturday around 9 for four players.", now);
    expect(parsed?.date).toBe("2026-08-29");
    expect(parsed?.players).toBe(4);
    expect(parsed?.preferredTime).toBe("09:00");
  });

  it("extracts after 3 PM today for two", () => {
    const parsed = parseTeeTimeRequest("Anything after 3 PM today for two?", now);
    expect(parsed?.date).toBe("2026-08-28");
    expect(parsed?.players).toBe(2);
    expect(parsed?.timeMin).toBe("15:00");
  });
});
