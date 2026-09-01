import { z } from "zod";

/** Events a browser can observe and submit without asserting server outcomes. */
export const clientWidgetEventNames = [
  "widget_view",
  "widget_open",
  "video_viewed",
  "service_viewed",
  "lead_capture_started",
  "swing_upload_started",
  "booking_clicked",
  "contact_clicked",
] as const;

export const clientWidgetEventNameSchema = z.enum(clientWidgetEventNames);
