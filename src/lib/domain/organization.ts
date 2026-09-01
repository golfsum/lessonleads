import type { OrganizationType } from "./types";

export const ORGANIZATION_TYPES = [
  "golf_coach",
  "golf_academy",
  "golf_course",
  "golf_facility",
  "golf_fitting_studio",
  "golf_retailer",
] as const satisfies readonly OrganizationType[];

export const ORGANIZATION_TYPE_LABELS: Record<OrganizationType, string> = {
  golf_coach: "Golf Coach",
  golf_academy: "Golf Academy",
  golf_course: "Golf Course",
  golf_facility: "Golf Facility",
  golf_fitting_studio: "Golf Fitting Studio",
  golf_retailer: "Golf Retailer",
};

export function isOrganizationType(value: string | undefined | null): value is OrganizationType {
  return Boolean(value && (ORGANIZATION_TYPES as readonly string[]).includes(value));
}

export function parseOrganizationType(value: unknown): OrganizationType {
  return isOrganizationType(String(value ?? "")) ? (value as OrganizationType) : "golf_coach";
}

/** Courses and facilities use tee-time + inquiry conversion as the primary path. */
export function isCourseLike(type: OrganizationType): boolean {
  return type === "golf_course" || type === "golf_facility";
}

/** Academies and courses both present a staff roster to visitors. */
export function hasStaffRoster(type: OrganizationType): boolean {
  return type === "golf_academy" || isCourseLike(type);
}

export function orgNoun(type: OrganizationType): string {
  if (type === "golf_coach") return "coach";
  if (type === "golf_academy") return "academy";
  if (type === "golf_fitting_studio") return "studio";
  if (type === "golf_retailer") return "shop";
  return "course";
}

export function orgPossessive(type: OrganizationType, name: string): string {
  if (type === "golf_coach") {
    const first = name.trim().split(/\s+/)[0] || name;
    return `${first}'s`;
  }
  return name;
}
