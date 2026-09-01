import { z } from "zod";
import { ADMIN_TICKET_PRIORITIES, ADMIN_TICKET_STATUSES, updateAdminTicket } from "@/lib/admin/data";
import { hasTrustedOrigin } from "@/lib/security/request";

const schema = z.object({ status: z.enum(ADMIN_TICKET_STATUSES).optional(), priority: z.enum(ADMIN_TICKET_PRIORITIES).optional() }).strict().refine((value) => Boolean(value.status || value.priority));

export async function PATCH(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid ticket update." }, { status: 400 });
  const { ticketId } = await params;
  try {
    const ticket = await updateAdminTicket(ticketId, parsed.data);
    if (!ticket) return Response.json({ error: "Ticket not found." }, { status: 404 });
    return Response.json({ ticket });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "ADMIN_FORBIDDEN") return Response.json({ error: "Admin access required." }, { status: 403 });
    console.error("[admin/ticket]", message);
    return Response.json({ error: "Couldn't update that ticket." }, { status: 500 });
  }
}
