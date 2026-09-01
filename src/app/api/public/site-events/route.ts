import { z } from "zod";
import { recordPlatformEvent } from "@/lib/platform/analytics";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { hasTrustedOrigin, requestFingerprint } from "@/lib/security/request";

const schema = z.object({
  visitorId: z.string().trim().min(8).max(100),
  sessionId: z.string().trim().min(8).max(100),
  path: z.string().trim().startsWith("/").max(500),
  referrer: z.string().trim().max(500).optional(),
  idempotencyKey: z.string().trim().min(8).max(200),
  properties: z
    .object({
      utmSource: z.string().trim().max(120).optional(),
      utmMedium: z.string().trim().max(120).optional(),
      utmCampaign: z.string().trim().max(120).optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });

  const rate = checkRateLimit(`site-event:${requestFingerprint(request)}`, 120, 60_000);
  if (!rate.allowed) return Response.json({ error: "Too many events." }, { status: 429 });

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid site event." }, { status: 400 });

  try {
    const result = await recordPlatformEvent({
      eventName: "page_view",
      visitorId: parsed.data.visitorId,
      sessionId: parsed.data.sessionId,
      path: parsed.data.path,
      referrer: parsed.data.referrer,
      idempotencyKey: parsed.data.idempotencyKey,
      properties: parsed.data.properties,
    });
    return Response.json({ ok: true, duplicate: result.duplicate }, { status: result.duplicate ? 200 : 201 });
  } catch {
    return Response.json({ error: "Could not record this visit." }, { status: 500 });
  }
}
