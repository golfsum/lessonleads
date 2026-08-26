/** Public embed id used on lessonleads.com (`data-coach="lessonleads"`). */
export const SITE_WIDGET_PUBLIC_ID = "lessonleads";
export const SITE_WIDGET_ID = "widget_site_lessonleads";
export const SITE_ORG_ID = "org_site_lessonleads";
export const SITE_COACH_ID = "coach_site_lessonleads";
export const SITE_CONVERSATION_PREFIX = "llsite-";

export function isSiteWidgetPublicId(value: string) {
  return value === SITE_WIDGET_PUBLIC_ID;
}

export function isSiteWidgetId(value: string) {
  return value === SITE_WIDGET_ID;
}

export function isSiteOrgId(value: string) {
  return value === SITE_ORG_ID;
}

export function isSiteConversationId(value: string) {
  return value.startsWith(SITE_CONVERSATION_PREFIX);
}
