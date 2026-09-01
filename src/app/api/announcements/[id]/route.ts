import { requireViewer } from "@/lib/auth/session";
import { deleteAnnouncement } from "@/lib/data/workspace";
import { hasTrustedOrigin } from "@/lib/security/request";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireViewer();
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const { id } = await params;
  const deleted = await deleteAnnouncement(id);
  if (!deleted) return Response.json({ error: "Announcement not found." }, { status: 404 });
  return Response.json({ ok: true });
}
