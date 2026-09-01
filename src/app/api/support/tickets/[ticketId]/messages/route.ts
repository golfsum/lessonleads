import { z } from "zod";
import { addCustomerTicketMessage } from "@/lib/support/tickets";
import { hasTrustedOrigin } from "@/lib/security/request";

const schema = z.object({ body: z.string().trim().min(1).max(5000) });

export async function POST(request: Request, { params }: { params: Promise<{ ticketId: string }> }) {
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Write a message before sending." }, { status: 400 });
  const { ticketId } = await params;
  try {
    const message = await addCustomerTicketMessage(ticketId, parsed.data.body);
    return Response.json({ message }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHENTICATED") return Response.json({ error: "Sign in to reply." }, { status: 401 });
    if (message === "NOT_FOUND") return Response.json({ error: "Ticket not found." }, { status: 404 });
    if (message === "TICKET_CLOSED") return Response.json({ error: "This ticket is closed." }, { status: 409 });
    console.error("[support/ticket-message]", message);
    return Response.json({ error: "Couldn't send that reply. Please try again." }, { status: 500 });
  }
}
