export const COURSE_DEMO_PUBLIC_ID = "demo-course";
export const COURSE_DEMO_WIDGET_ID = "widget_demo_course";
export const COURSE_DEMO_ORG_ID = "org_demo_course";
export const COURSE_DEMO_COACH_ID = "coach_demo_course";
export const COURSE_DEMO_CONVERSATION_PREFIX = "llcourse-";

export function isCourseDemoPublicId(value: string) {
  return value === COURSE_DEMO_PUBLIC_ID;
}

export function isCourseDemoWidgetId(value: string) {
  return value === COURSE_DEMO_WIDGET_ID;
}

export function isCourseDemoOrgId(value: string) {
  return value === COURSE_DEMO_ORG_ID;
}

export function isCourseDemoConversationId(value: string) {
  return value.startsWith(COURSE_DEMO_CONVERSATION_PREFIX);
}
