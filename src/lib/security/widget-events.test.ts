import { describe, expect, it } from "vitest";
import { clientWidgetEventNames, clientWidgetEventNameSchema } from "./widget-events";

describe("public widget event names", () => {
  it("accepts only client-observable events", () => {
    for (const eventName of clientWidgetEventNames) {
      expect(clientWidgetEventNameSchema.safeParse(eventName).success).toBe(true);
    }
  });

  it.each([
    "conversation_started",
    "message_sent",
    "lead_captured",
    "swing_uploaded",
  ])("rejects the server-owned %s event", (eventName) => {
    expect(clientWidgetEventNameSchema.safeParse(eventName).success).toBe(false);
  });

  it.each([
    "tee_time_search",
    "tee_time_result_viewed",
    "tee_time_booking_clicked",
    "unknown_event",
  ])("rejects unsupported event %s", (eventName) => {
    expect(clientWidgetEventNameSchema.safeParse(eventName).success).toBe(false);
  });
});
