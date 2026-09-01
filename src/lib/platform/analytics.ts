import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const EVENT_NAME_PATTERN = /^[a-z][a-z0-9_]*$/;

export interface PlatformEventInput {
  eventName: string;
  visitorId: string;
  sessionId: string;
  userId?: string;
  organizationId?: string;
  path?: string;
  referrer?: string;
  properties?: Record<string, string | number | boolean | null>;
  idempotencyKey?: string;
  occurredAt?: string;
}

export interface RecordedPlatformEvent {
  id: string | null;
  duplicate: boolean;
}

function requiredIdentifier(value: string, label: string) {
  const normalized = value.trim();
  if (normalized.length < 8 || normalized.length > 100) {
    throw new Error(`${label} must be between 8 and 100 characters.`);
  }
  return normalized;
}

function optionalText(value: string | undefined, maxLength: number) {
  const normalized = value?.trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

export function isPlatformEventName(value: string) {
  return value.length >= 2 && value.length <= 64 && EVENT_NAME_PATTERN.test(value);
}

/**
 * Persist a first-party LessonLeads product or marketing event. This function
 * is server-only because platform_events intentionally has no browser grants.
 */
export async function recordPlatformEvent(input: PlatformEventInput): Promise<RecordedPlatformEvent> {
  if (!isPlatformEventName(input.eventName)) throw new Error("Invalid platform event name.");
  const visitorId = requiredIdentifier(input.visitorId, "Visitor id");
  const sessionId = requiredIdentifier(input.sessionId, "Session id");
  const idempotencyKey = optionalText(input.idempotencyKey, 200);
  if (input.idempotencyKey && !idempotencyKey) throw new Error("Invalid idempotency key.");

  const { data, error } = await createSupabaseAdminClient()
    .from("platform_events")
    .insert({
      event_name: input.eventName,
      visitor_id: visitorId,
      session_id: sessionId,
      user_id: input.userId ?? null,
      organization_id: input.organizationId ?? null,
      path: optionalText(input.path, 500),
      referrer: optionalText(input.referrer, 500),
      properties: input.properties ?? {},
      idempotency_key: idempotencyKey,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (error?.code === "23505" && idempotencyKey) return { id: null, duplicate: true };
  if (error) throw new Error(`platform event: ${error.message}`);
  return { id: data?.id ? String(data.id) : null, duplicate: false };
}
