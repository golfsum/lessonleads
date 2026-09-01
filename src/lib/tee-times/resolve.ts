import type { BookingIntegration, Location, TeeTimeProviderId } from "@/lib/domain/types";
import { getCached, setCached, cacheKey } from "./cache";
import { CustomUrlProvider, DemoTeeTimeProvider, StubProvider } from "./providers/fallback";
import { GolfNowProvider, golfNowCredentialsFromEnv } from "./providers/golfnow";
import type { TeeTimeProvider, TeeTimeSearchInput, TeeTimeSearchResult } from "./types";
import { AVAILABILITY_NOTICE } from "./types";

export function resolveTeeTimeProvider(input: {
  integration?: BookingIntegration | null;
  location?: Location | null;
  bookingUrl?: string;
  demo?: boolean;
}): TeeTimeProvider {
  if (input.demo) return new DemoTeeTimeProvider();
  const provider = input.integration?.provider ?? input.location?.teeTimeProvider ?? "none";
  const bookingUrl = input.integration?.configuration.bookingUrl
    ? String(input.integration.configuration.bookingUrl)
    : input.location?.bookingUrl || input.bookingUrl || "";

  if (provider === "golfnow") {
    const credentials = golfNowCredentialsFromEnv();
    if (credentials && input.integration?.status === "connected") {
      return new GolfNowProvider(credentials, {
        facilityId: input.integration.externalFacilityId || input.location?.externalFacilityId,
        bookingUrl,
      });
    }
    return bookingUrl ? new CustomUrlProvider(bookingUrl) : new StubProvider("golfnow", bookingUrl);
  }

  if (provider === "custom_url" || provider === "none") {
    return new CustomUrlProvider(bookingUrl);
  }

  if (provider === "demo") return new DemoTeeTimeProvider();
  return new StubProvider(provider, bookingUrl);
}

function withinWindow(startTime: string, timeMin?: string, timeMax?: string) {
  if (!timeMin && !timeMax) return true;
  const date = new Date(startTime);
  if (Number.isNaN(date.getTime())) {
    const match = startTime.match(/T(\d{2}:\d{2})/);
    const clock = match?.[1];
    if (!clock) return true;
    if (timeMin && clock < timeMin) return false;
    if (timeMax && clock > timeMax) return false;
    return true;
  }
  const clock = `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  if (timeMin && clock < timeMin) return false;
  if (timeMax && clock > timeMax) return false;
  return true;
}

export async function searchTeeTimesForOrganization(input: {
  organizationId: string;
  provider: TeeTimeProvider;
  search: TeeTimeSearchInput;
}): Promise<TeeTimeSearchResult> {
  const key = cacheKey([
    input.organizationId,
    input.provider.id,
    input.search.date,
    input.search.players,
    input.search.timeMin,
    input.search.timeMax,
    input.search.locationId,
    input.search.facilityId,
  ]);
  const cached = getCached<TeeTimeSearchResult>(key);
  if (cached) return cached;

  try {
    const result = await input.provider.searchTeeTimes(input.search);
    const filtered = {
      ...result,
      teeTimes: result.teeTimes.filter((teeTime) => withinWindow(teeTime.startTime, input.search.timeMin, input.search.timeMax)),
      notice: result.notice ?? AVAILABILITY_NOTICE,
    };
    setCached(key, filtered);
    return filtered;
  } catch {
    return {
      teeTimes: [],
      provider: input.provider.id,
      searchedAt: new Date().toISOString(),
      error: "provider_unavailable",
      notice: "I couldn't retrieve live tee times right now.",
    };
  }
}

export function providerLabel(id: TeeTimeProviderId | string) {
  const labels: Record<string, string> = {
    golfnow: "GolfNow",
    foreup: "foreUP",
    lightspeed: "Lightspeed Golf",
    club_caddie: "Club Caddie",
    chronogolf: "Chronogolf",
    custom_url: "Custom booking URL",
    demo: "Demo",
    none: "None",
  };
  return labels[id] ?? id;
}
