import { z } from "zod";
import { requireViewer } from "@/lib/auth/session";
import { upsertStaff } from "@/lib/data/workspace";
import { hasTrustedOrigin, safeBookingUrl } from "@/lib/security/request";

const schema = z.object({
  id: z.string().max(100).optional(),
  name: z.string().trim().min(2).max(120),
  title: z.string().trim().min(2).max(120),
  bio: z.string().trim().min(10).max(2000),
  specialties: z.array(z.string().trim().min(1).max(60)).max(12),
  bookingUrl: z.string().trim().max(500).optional(),
  email: z.string().trim().max(180).optional(),
  active: z.boolean(),
});

export async function POST(request: Request) {
  await requireViewer();
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check the staff details." }, { status: 400 });
  if (parsed.data.bookingUrl && !safeBookingUrl(parsed.data.bookingUrl)) {
    return Response.json({ error: "Enter a valid booking URL (https)." }, { status: 400 });
  }
  const staff = await upsertStaff({
    ...parsed.data,
    bookingUrl: parsed.data.bookingUrl || undefined,
    email: parsed.data.email || undefined,
  });
  return Response.json({ staff });
}
