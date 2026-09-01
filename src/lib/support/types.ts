export const supportTicketCategories = [
  "general",
  "billing",
  "installation",
  "widget",
  "account",
  "bug",
  "feature_request",
] as const;

export const supportTicketStatuses = [
  "open",
  "in_progress",
  "waiting_on_customer",
  "resolved",
  "closed",
] as const;

export const supportTicketPriorities = ["low", "normal", "high", "urgent"] as const;

export type SupportTicketCategory = (typeof supportTicketCategories)[number];
export type SupportTicketStatus = (typeof supportTicketStatuses)[number];
export type SupportTicketPriority = (typeof supportTicketPriorities)[number];

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  senderType: "customer" | "admin" | "system";
  body: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  number: number;
  organizationId: string;
  subject: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  messages?: SupportTicketMessage[];
}
