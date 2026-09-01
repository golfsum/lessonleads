export const ADMIN_TICKET_CATEGORIES = ["general", "billing", "installation", "widget", "account", "bug", "feature_request"] as const;
export const ADMIN_TICKET_PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export const ADMIN_TICKET_STATUSES = ["open", "in_progress", "waiting_on_customer", "resolved", "closed"] as const;

export type AdminTicketCategory = (typeof ADMIN_TICKET_CATEGORIES)[number];
export type AdminTicketPriority = (typeof ADMIN_TICKET_PRIORITIES)[number];
export type AdminTicketStatus = (typeof ADMIN_TICKET_STATUSES)[number];
