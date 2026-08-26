import { z } from "zod";
import { requireViewer } from "@/lib/auth/session";
import { addManualKnowledge } from "@/lib/data/workspace";
import { hasTrustedOrigin } from "@/lib/security/request";

const schema = z.object({
  title: z.string().trim().min(2).max(160),
  content: z.string().trim().min(10).max(20_000),
});

export async function POST(request: Request) {
  await requireViewer();
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Add a title and at least a sentence of content." }, { status: 400 });
  const source = await addManualKnowledge(parsed.data);
  return Response.json({ ok: true, source }, { status: 201 });
}
