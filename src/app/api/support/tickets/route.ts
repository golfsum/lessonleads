import { z } from "zod";
import { createCustomerTicket } from "@/lib/support/tickets";
import { supportTicketCategories } from "@/lib/support/types";
import { hasTrustedOrigin } from "@/lib/security/request";

const schema = z.object({
  subject: z.string().trim().min(4).max(160),
  category: z.enum(supportTicketCategories),
  body: z.string().trim().min(10).max(5000),
});

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Add a subject and at least 10 characters of detail." }, { status: 400 });
  try {
    const ticket = await createCustomerTicket(parsed.data);
    return Response.json({ ticket }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "UNAUTHENTICATED") return Response.json({ error: "Sign in to contact support." }, { status: 401 });
    if (message === "DEMO_NOT_SUPPORTED") return Response.json({ error: "Support tickets are unavailable in the demo workspace." }, { status: 403 });
    console.error("[support/tickets]", message);
    return Response.json({ error: "Couldn't create that ticket. Please try again." }, { status: 500 });
  }
}
