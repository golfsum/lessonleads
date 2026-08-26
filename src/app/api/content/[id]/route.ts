import { z } from "zod";
import { requireViewer } from "@/lib/auth/session";
import { deleteContentItem, updateContentItem } from "@/lib/data/workspace";
import { hasTrustedOrigin } from "@/lib/security/request";

const schema = z.object({
  title: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().max(4000).optional(),
  categories: z.array(z.string().trim().min(1).max(60)).max(8).optional(),
  includeInAi: z.boolean().optional(),
  active: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireViewer();
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid update." }, { status: 400 });
  const item = await updateContentItem({ id, ...parsed.data });
  if (!item) return Response.json({ error: "Content not found." }, { status: 404 });
  return Response.json({ item });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireViewer();
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const { id } = await params;
  const deleted = await deleteContentItem(id);
  if (!deleted) return Response.json({ error: "Content not found." }, { status: 404 });
  return Response.json({ ok: true });
}
