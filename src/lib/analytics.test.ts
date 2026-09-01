import { describe, expect, it } from "vitest";
import { calculateAnalytics } from "./analytics";
import { createDemoWorkspace } from "./demo/seed";

describe("calculateAnalytics", () => {
  it("counts tee-time events separately from confirmed bookings", () => {
    const data = createDemoWorkspace();
    data.organization.type = "golf_course";
    data.events.push({
      id: "e1",
      organizationId: data.organization.id,
      widgetId: data.widget.id,
      name: "tee_time_search",
      sessionId: "s1",
      occurredAt: new Date().toISOString(),
    });
    data.events.push({
      id: "e2",
      organizationId: data.organization.id,
      widgetId: data.widget.id,
      name: "tee_time_booking_clicked",
      sessionId: "s1",
      occurredAt: new Date().toISOString(),
    });
    const summary = calculateAnalytics(data);
    expect(summary.teeTimeSearches).toBe(1);
    expect(summary.teeTimeBookingClicks).toBe(1);
    expect(summary.confirmedTeeTimeBookings).toBe(0);
    expect(summary.funnel.some((stage) => stage.label === "Tee Time Searches")).toBe(true);
  });
});
