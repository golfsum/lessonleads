import { z } from "zod";
import { requireViewer } from "@/lib/auth/session";
import { upsertAnnouncement } from "@/lib/data/workspace";
import { hasTrustedOrigin } from "@/lib/security/request";

const schema = z.object({
  id: z.string().max(100).optional(),
  title: z.string().trim().min(2).max(120),
  message: z.string().trim().min(8).max(1000),
  startsAt: z.string().min(10).max(40),
  expiresAt: z.string().max(40).optional(),
  priority: z.number().int().min(0).max(100),
  active: z.boolean(),
});

export async function POST(request: Request) {
  await requireViewer();
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Check the announcement." }, { status: 400 });
  const announcement = await upsertAnnouncement({
    ...parsed.data,
    expiresAt: parsed.data.expiresAt || undefined,
  });
  return Response.json({ announcement });
}
