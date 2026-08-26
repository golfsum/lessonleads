import { z } from "zod";
import { requireViewer } from "@/lib/auth/session";
import { updateLeadNotes } from "@/lib/data/workspace";
import { hasTrustedOrigin } from "@/lib/security/request";

const schema = z.object({ notes: z.string().max(8000) });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireViewer();
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const { id } = await params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid notes." }, { status: 400 });
  const lead = await updateLeadNotes(id, parsed.data.notes);
  if (!lead) return Response.json({ error: "Lead not found." }, { status: 404 });
  return Response.json({ lead });
}
