import { z } from "zod";
import { requireViewer } from "@/lib/auth/session";
import { WIDGET_SECTION_KEYS } from "@/lib/domain/types";
import { saveOnboarding } from "@/lib/data/workspace";
import { hasTrustedOrigin, safeBookingUrl } from "@/lib/security/request";

const schema = z.object({
  organizationType: z.enum(["golf_coach", "golf_academy", "golf_course", "golf_facility", "golf_fitting_studio", "golf_retailer"]).optional(),
  coachName: z.string().trim().min(2).max(100),
  businessName: z.string().trim().min(2).max(120),
  email: z.email(),
  website: z.string().trim().max(240).optional(),
  location: z.string().trim().max(160),
  timezone: z.string().trim().min(2).max(80),
  bookingProvider: z.enum(["coachnow", "golf_genius", "calendly", "acuity", "square", "mindbody", "custom", "none"]),
  bookingUrl: z.string().trim().max(500),
  teeTimeProvider: z.enum(["golfnow", "foreup", "lightspeed", "club_caddie", "chronogolf", "custom_url", "demo", "none"]).optional(),
  teeTimeBookingUrl: z.string().trim().max(500).optional(),
  courseCount: z.number().int().min(1).max(20).optional(),
  accessType: z.enum(["public", "private", "resort", "semi_private"]).optional(),
  enabledSections: z.array(z.enum(WIDGET_SECTION_KEYS)).min(1).max(16),
  assistantName: z.string().trim().max(60).optional(),
  welcomeMessage: z.string().trim().max(400).optional(),
  primaryColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  logoUrl: z.union([z.url().max(500), z.literal("")]).optional(),
});

export async function POST(request: Request) {
  await requireViewer();
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check the required fields." }, { status: 400 });
  const courseLike = parsed.data.organizationType === "golf_course" || parsed.data.organizationType === "golf_facility";
  if (!courseLike && parsed.data.bookingProvider !== "none" && !safeBookingUrl(parsed.data.bookingUrl)) {
    return Response.json({ error: "Enter a valid booking URL (https)." }, { status: 400 });
  }
  if (courseLike && parsed.data.teeTimeProvider && parsed.data.teeTimeProvider !== "none" && parsed.data.teeTimeBookingUrl && !safeBookingUrl(parsed.data.teeTimeBookingUrl)) {
    return Response.json({ error: "Enter a valid tee-time booking URL (https)." }, { status: 400 });
  }
  await saveOnboarding(parsed.data);
  return Response.json({ ok: true });
}
