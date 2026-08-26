import { z } from "zod";
import { requireViewer } from "@/lib/auth/session";
import { deleteFaq, upsertFaq } from "@/lib/data/workspace";
import { hasTrustedOrigin } from "@/lib/security/request";

const upsertSchema = z.object({
  action: z.literal("upsert"),
  id: z.string().max(100).optional(),
  question: z.string().trim().min(4).max(300),
  answer: z.string().trim().min(4).max(4000),
  enabled: z.boolean(),
});
const deleteSchema = z.object({ action: z.literal("delete"), id: z.string().min(1).max(100) });
const schema = z.discriminatedUnion("action", [upsertSchema, deleteSchema]);

export async function POST(request: Request) {
  await requireViewer();
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid FAQ." }, { status: 400 });
  if (parsed.data.action === "delete") {
    const deleted = await deleteFaq(parsed.data.id);
    if (!deleted) return Response.json({ error: "FAQ not found." }, { status: 404 });
    return Response.json({ ok: true });
  }
  const faq = await upsertFaq(parsed.data);
  return Response.json({ ok: true, faq });
}
