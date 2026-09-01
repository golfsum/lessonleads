import { z } from "zod";
import { ADMIN_TICKET_STATUSES, addAdminTicketMessage, updateAdminTicket } from "@/lib/admin/data";
import { hasTrustedOrigin } from "@/lib/security/request";

const schema = z.object({ body: z.string().trim().min(1).max(5000), internal: z.boolean().optional(), status: z.enum(ADMIN_TICKET_STATUSES).optional() }).strict();

export async function POST(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Write a message before sending." }, { status: 400 });
  const { ticketId } = await params;
  try {
    const message = await addAdminTicketMessage(ticketId, { body: parsed.data.body, internal: parsed.data.internal });
    if (!message) return Response.json({ error: "Ticket not found." }, { status: 404 });
    if (parsed.data.status) await updateAdminTicket(ticketId, { status: parsed.data.status });
    return Response.json({ message }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "ADMIN_FORBIDDEN") return Response.json({ error: "Admin access required." }, { status: 403 });
    console.error("[admin/ticket-message]", message);
    return Response.json({ error: "Couldn't add that message." }, { status: 500 });
  }
}
