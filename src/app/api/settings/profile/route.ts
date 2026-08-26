import { z } from "zod";
import { requireViewer } from "@/lib/auth/session";
import { updateCoachProfile } from "@/lib/data/workspace";
import { hasTrustedOrigin, safeBookingUrl } from "@/lib/security/request";

const schema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  businessName: z.string().trim().min(2).max(120).optional(),
  email: z.email().optional(),
  phone: z.string().trim().max(40).optional(),
  location: z.string().trim().min(2).max(160).optional(),
  title: z.string().trim().min(2).max(100).optional(),
  credentials: z.array(z.string().trim().min(1).max(120)).max(8).optional(),
  bio: z.string().trim().max(1500).optional(),
  philosophy: z.string().trim().max(1500).optional(),
  teachingFocus: z.array(z.string().trim().min(1).max(60)).max(10).optional(),
  socialLinks: z
    .object({
      instagram: z.union([z.url().max(300), z.literal("")]).optional(),
      youtube: z.union([z.url().max(300), z.literal("")]).optional(),
      facebook: z.union([z.url().max(300), z.literal("")]).optional(),
      x: z.union([z.url().max(300), z.literal("")]).optional(),
      tiktok: z.union([z.url().max(300), z.literal("")]).optional(),
    })
    .optional(),
  bookingProvider: z.enum(["coachnow", "golf_genius", "calendly", "acuity", "square", "mindbody", "custom", "none"]).optional(),
  bookingUrl: z.string().trim().max(500).optional(),
  profilePhotoUrl: z.union([z.url().max(500), z.literal("")]).optional(),
  notificationPrefs: z
    .object({
      newLead: z.boolean(),
      highIntentLead: z.boolean(),
      swingUpload: z.boolean(),
      bookingClick: z.boolean(),
      everyConversation: z.boolean(),
    })
    .optional(),
});

export async function PATCH(request: Request) {
  await requireViewer();
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check the profile fields." }, { status: 400 });
  if (parsed.data.bookingUrl && !safeBookingUrl(parsed.data.bookingUrl)) {
    return Response.json({ error: "Enter a valid booking URL (https)." }, { status: 400 });
  }
  const cleaned = {
    ...parsed.data,
    profilePhotoUrl: parsed.data.profilePhotoUrl === "" ? undefined : parsed.data.profilePhotoUrl,
    socialLinks: parsed.data.socialLinks
      ? Object.fromEntries(Object.entries(parsed.data.socialLinks).map(([key, value]) => [key, value === "" ? undefined : value]))
      : undefined,
  };
  const coach = await updateCoachProfile(cleaned);
  return Response.json({ coach });
}
