import type { Service } from "./types";

export function formatPrice(service: Pick<Service, "priceCents" | "priceLabel">): string {
  if (service.priceLabel) return service.priceLabel;
  if (service.priceCents !== null && service.priceCents !== undefined) {
    const dollars = service.priceCents / 100;
    return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
  }
  return "Contact for pricing";
}

export function formatDuration(minutes: number | null): string | null {
  if (!minutes) return null;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours} hour${hours > 1 ? "s" : ""}`;
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
