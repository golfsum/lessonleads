import { z } from "zod";
import { requireViewer } from "@/lib/auth/session";
import { saveOnboarding } from "@/lib/data/workspace";
import { hasTrustedOrigin, safeBookingUrl } from "@/lib/security/request";

const schema = z.object({
  coachName: z.string().trim().min(2).max(100),
  businessName: z.string().trim().min(2).max(120),
  email: z.email(),
  website: z.string().trim().max(240).optional(),
  location: z.string().trim().max(160),
  timezone: z.string().trim().min(2).max(80),
  bookingProvider: z.enum(["coachnow", "golf_genius", "calendly", "acuity", "square", "mindbody", "custom", "none"]),
  bookingUrl: z.string().trim().max(500),
  enabledSections: z.array(z.enum(["ask", "lessons", "videos", "coach", "drills", "resources", "faq", "swing", "contact"])).min(1).max(9),
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
  if (parsed.data.bookingProvider !== "none" && !safeBookingUrl(parsed.data.bookingUrl)) {
    return Response.json({ error: "Enter a valid booking URL (https)." }, { status: 400 });
  }
  await saveOnboarding(parsed.data);
  return Response.json({ ok: true });
}
