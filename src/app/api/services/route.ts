import { z } from "zod";
import { requireViewer } from "@/lib/auth/session";
import { upsertService } from "@/lib/data/workspace";
import { hasTrustedOrigin, safeBookingUrl } from "@/lib/security/request";

const schema = z.object({
  id: z.string().max(100).optional(),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().min(10).max(600),
  price: z.coerce.number().min(0).max(100_000).nullable(),
  priceLabel: z.string().trim().max(60).optional(),
  durationMinutes: z.coerce.number().int().min(5).max(1440).nullable(),
  mode: z.enum(["in_person", "online", "both"]),
  location: z.string().trim().max(200).optional(),
  bookingUrl: z.string().trim().max(500).optional(),
  ctaLabel: z.string().trim().max(60).optional(),
  featured: z.boolean(),
  bestFor: z.array(z.string().trim().min(1).max(60)).max(10),
  active: z.boolean(),
});

export async function POST(request: Request) {
  await requireViewer();
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check the service details." }, { status: 400 });
  if (parsed.data.bookingUrl && !safeBookingUrl(parsed.data.bookingUrl)) {
    return Response.json({ error: "Enter a valid booking URL (https)." }, { status: 400 });
  }
  const service = await upsertService({
    ...parsed.data,
    priceCents: parsed.data.price === null ? null : Math.round(parsed.data.price * 100),
    priceLabel: parsed.data.priceLabel || undefined,
    location: parsed.data.location || undefined,
    bookingUrl: parsed.data.bookingUrl || undefined,
    ctaLabel: parsed.data.ctaLabel || undefined,
  });
  return Response.json({ service });
}
