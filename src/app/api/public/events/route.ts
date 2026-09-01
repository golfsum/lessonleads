import { z } from "zod";
import { getPublicWidget, recordWidgetEvent } from "@/lib/data/workspace";
import { clientWidgetEventNameSchema } from "@/lib/security/widget-events";
import { widgetOriginAllowed } from "@/lib/security/origins";

const schema = z.object({
  coachId: z.string().min(2).max(100),
  sessionId: z.string().min(8).max(100),
  name: clientWidgetEventNameSchema,
  conversationId: z.string().max(100).optional(),
  leadId: z.string().max(100).optional(),
  page: z.string().max(500).optional(),
  properties: z.record(z.string(), z.union([z.string().max(500), z.number(), z.boolean(), z.null()])).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid event." }, { status: 400 });
  const data = await getPublicWidget(parsed.data.coachId);
  if (!data) return Response.json({ error: "Widget not found." }, { status: 404 });
  if (
    data.widget.allowedOrigins.length > 0 &&
    !widgetOriginAllowed({
      origin: request.headers.get("origin"),
      page: parsed.data.page,
      referrer: request.headers.get("referer"),
      allowedOrigins: data.widget.allowedOrigins,
    })
  ) {
    return Response.json({ error: "This widget is not enabled for this website." }, { status: 403 });
  }
  await recordWidgetEvent({
    widgetId: data.widget.id,
    name: parsed.data.name,
    sessionId: parsed.data.sessionId,
    conversationId: parsed.data.conversationId,
    leadId: parsed.data.leadId,
    properties: parsed.data.properties,
  });
  return Response.json({ ok: true });
}
