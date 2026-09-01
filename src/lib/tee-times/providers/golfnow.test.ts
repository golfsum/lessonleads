import { describe, expect, it } from "vitest";
import { normalizeGolfNowTeeTimes } from "./golfnow";

describe("normalizeGolfNowTeeTimes", () => {
  it("maps documented GolfNow fields and drops times that cannot fit the party", () => {
    const results = normalizeGolfNowTeeTimes(
      {
        TeeTimes: [
          {
            Time: "2026-08-29T08:42:00",
            FacilityID: "123",
            FacilityName: "Desert Fairways",
            CourseName: "North Course",
            PlayerRule: 4,
            Rates: [{ Price: 64, RateName: "Standard", CartIncluded: true, HoleCount: 18, TeeTimeRateID: "r1" }],
          },
          {
            Time: "2026-08-29T09:06:00",
            FacilityID: "123",
            PlayerRule: 1,
            Rates: [{ Price: 69, TeeTimeRateID: "r2" }],
          },
        ],
      },
      { organizationId: "org", date: "2026-08-29", players: 4, timezone: "America/Phoenix" },
      "https://www.golfnow.com/tee-times/facility/123",
    );
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      provider: "golfnow",
      courseName: "North Course",
      availablePlayers: 4,
      pricePerPlayer: 64,
      holes: 18,
      cartIncluded: true,
      bookable: true,
    });
  });
});
