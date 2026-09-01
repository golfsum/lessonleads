import { z } from "zod";
import { requireViewer } from "@/lib/auth/session";
import { saveBookingIntegration } from "@/lib/data/workspace";
import { hasTrustedOrigin, safeBookingUrl } from "@/lib/security/request";

const schema = z.object({
  provider: z.enum(["golfnow", "foreup", "lightspeed", "club_caddie", "chronogolf", "custom_url", "demo", "none"]),
  bookingUrl: z.string().trim().max(500).optional(),
  externalFacilityId: z.string().trim().max(80).optional(),
  locationId: z.string().max(100).optional(),
});

export async function POST(request: Request) {
  await requireViewer();
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check the integration details." }, { status: 400 });
  if (parsed.data.bookingUrl && !safeBookingUrl(parsed.data.bookingUrl)) {
    return Response.json({ error: "Enter a valid booking URL (https)." }, { status: 400 });
  }
  const integration = await saveBookingIntegration({
    provider: parsed.data.provider,
    bookingUrl: parsed.data.bookingUrl || undefined,
    externalFacilityId: parsed.data.externalFacilityId || undefined,
    locationId: parsed.data.locationId || undefined,
  });
  return Response.json({ integration });
}
