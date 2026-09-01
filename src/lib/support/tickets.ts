import "server-only";

import { getViewer } from "@/lib/auth/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  SupportTicket,
  SupportTicketCategory,
  SupportTicketMessage,
  SupportTicketPriority,
  SupportTicketStatus,
} from "@/lib/support/types";

export type { SupportTicket, SupportTicketCategory, SupportTicketMessage, SupportTicketPriority, SupportTicketStatus } from "@/lib/support/types";

function mapTicket(row: Record<string, unknown>): SupportTicket {
  return {
    id: String(row.id),
    number: Number(row.ticket_number),
    organizationId: String(row.organization_id),
    subject: String(row.subject),
    category: row.category as SupportTicketCategory,
    priority: row.priority as SupportTicketPriority,
    status: row.status as SupportTicketStatus,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
  };
}

function mapMessage(row: Record<string, unknown>): SupportTicketMessage {
  return {
    id: String(row.id),
    ticketId: String(row.ticket_id),
    senderType: row.sender_type as SupportTicketMessage["senderType"],
    body: String(row.body),
    createdAt: String(row.created_at),
  };
}

async function customerScope() {
  const viewer = await getViewer();
  if (!viewer) throw new Error("UNAUTHENTICATED");
  if (viewer.demo) throw new Error("DEMO_NOT_SUPPORTED");
  return { viewer, supabase: await createSupabaseServerClient() };
}

function throwIf(error: { message: string } | null, context: string) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

export async function getCustomerTickets(): Promise<SupportTicket[]> {
  const { viewer, supabase } = await customerScope();
  const { data, error } = await supabase
    .from("support_tickets")
    .select("id, ticket_number, organization_id, subject, category, priority, status, created_at, updated_at, resolved_at")
    .eq("organization_id", viewer.organizationId)
    .order("updated_at", { ascending: false })
    .limit(100);
  throwIf(error, "support tickets");
  return (data ?? []).map(mapTicket);
}

export async function getCustomerTicket(ticketId: string): Promise<SupportTicket | null> {
  const { viewer, supabase } = await customerScope();
  const [ticketResult, messagesResult] = await Promise.all([
    supabase
      .from("support_tickets")
      .select("id, ticket_number, organization_id, subject, category, priority, status, created_at, updated_at, resolved_at")
      .eq("id", ticketId)
      .eq("organization_id", viewer.organizationId)
      .maybeSingle(),
    supabase
      .from("support_ticket_messages")
      .select("id, ticket_id, sender_type, body, created_at")
      .eq("ticket_id", ticketId)
      .eq("internal", false)
      .order("created_at", { ascending: true })
      .limit(250),
  ]);
  throwIf(ticketResult.error, "support ticket");
  throwIf(messagesResult.error, "support ticket messages");
  if (!ticketResult.data) return null;
  return { ...mapTicket(ticketResult.data), messages: (messagesResult.data ?? []).map(mapMessage) };
}

export async function createCustomerTicket(input: {
  subject: string;
  category: SupportTicketCategory;
  body: string;
}): Promise<SupportTicket> {
  const { viewer, supabase } = await customerScope();
  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .insert({
      organization_id: viewer.organizationId,
      created_by: viewer.id,
      subject: input.subject,
      category: input.category,
    })
    .select("id, ticket_number, organization_id, subject, category, priority, status, created_at, updated_at, resolved_at")
    .single();
  throwIf(ticketError, "create support ticket");
  if (!ticket) throw new Error("create support ticket: no ticket returned");

  const { error: messageError } = await supabase.from("support_ticket_messages").insert({
    ticket_id: ticket.id,
    sender_user_id: viewer.id,
    sender_type: "customer",
    body: input.body,
  });
  throwIf(messageError, "create support message");
  return mapTicket(ticket);
}

export async function addCustomerTicketMessage(ticketId: string, body: string): Promise<SupportTicketMessage> {
  const { viewer, supabase } = await customerScope();
  const { data: ticket, error: ticketError } = await supabase
    .from("support_tickets")
    .select("id, status")
    .eq("id", ticketId)
    .eq("organization_id", viewer.organizationId)
    .maybeSingle();
  throwIf(ticketError, "support ticket");
  if (!ticket) throw new Error("NOT_FOUND");
  if (ticket.status === "closed" || ticket.status === "resolved") throw new Error("TICKET_CLOSED");

  const { data, error } = await supabase
    .from("support_ticket_messages")
    .insert({
      ticket_id: ticketId,
      sender_user_id: viewer.id,
      sender_type: "customer",
      body,
    })
    .select("id, ticket_id, sender_type, body, created_at")
    .single();
  throwIf(error, "reply to support ticket");
  if (!data) throw new Error("reply to support ticket: no message returned");

  return mapMessage(data);
}
