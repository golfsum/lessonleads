import { createHash, createHmac } from "node:crypto";
import type { TeeTime, TeeTimeSearchInput, TeeTimeSearchResult } from "../types";
import { AVAILABILITY_NOTICE, type TeeTimeProvider } from "../types";

export interface GolfNowCredentials {
  baseUrl: string;
  username: string;
  password: string;
  clientSecret?: string;
  channelId: string;
  environment: "sandbox" | "production";
}

export function golfNowCredentialsFromEnv(): GolfNowCredentials | null {
  const username = process.env.GOLFNOW_API_USERNAME?.trim();
  const password = process.env.GOLFNOW_API_PASSWORD?.trim();
  if (!username || !password) return null;
  const environment = process.env.GOLFNOW_ENVIRONMENT === "production" ? "production" : "sandbox";
  const defaultBase =
    environment === "production" ? "https://api.gnsvc.com/rest" : "https://sandbox.api.gnsvc.com/rest";
  return {
    baseUrl: (process.env.GOLFNOW_API_BASE_URL?.trim() || defaultBase).replace(/\/$/, ""),
    username,
    password,
    clientSecret: process.env.GOLFNOW_CLIENT_SECRET?.trim(),
    channelId: process.env.GOLFNOW_CHANNEL_ID?.trim() || "11329",
    environment,
  };
}

function sha1Base64(value: string) {
  return createHash("sha1").update(value, "utf8").digest("base64");
}

function authHeaders(credentials: GolfNowCredentials): Record<string, string> {
  const headers: Record<string, string> = {
    "content-type": "application/json; charset=utf-8",
    Accept: "application/json",
    AdvancedErrorCodes: "True",
    UserName: credentials.username,
  };
  if (credentials.clientSecret) {
    const timestamp = String(Math.floor(Date.now() / 1000));
    const signature = createHmac("sha256", credentials.clientSecret)
      .update(`${credentials.username}${sha1Base64(credentials.password)}${timestamp}`)
      .digest("base64");
    headers.Timestamp = timestamp;
    headers.Authorization = signature;
  } else {
    headers.Password = credentials.password;
  }
  return headers;
}

function toIsoDateRange(date: string, timeMin?: string, timeMax?: string) {
  const start = `${date}T${timeMin ?? "00:00"}:00`;
  const end = `${date}T${timeMax ?? "23:59"}:00`;
  return { start, end };
}

function dollars(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
    if (typeof value === "number") return String(value);
  }
  return undefined;
}

function pickNumber(record: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    const value = dollars(record[key]);
    if (value !== undefined) return value;
  }
  return undefined;
}

export function normalizeGolfNowTeeTimes(
  payload: unknown,
  input: TeeTimeSearchInput,
  bookingUrl?: string,
): TeeTime[] {
  const root = asRecord(payload);
  const teeTimes = asArray(root?.TeeTimes ?? root?.teeTimes ?? root?.Results ?? root?.results);
  const timezone = input.timezone || "America/New_York";
  const results: TeeTime[] = [];

  for (const entry of teeTimes) {
    const row = asRecord(entry);
    if (!row) continue;
    const rates = asArray(row.Rates ?? row.rates);
    const primaryRate = asRecord(rates[0]) ?? row;
    const facilityId = pickString(row, ["FacilityID", "facilityId", "FacilityId"]);
    const startTime = pickString(row, ["Time", "time", "StartTime", "startTime", "TeeTime"]);
    if (!startTime) continue;
    const rateId = pickString(primaryRate, ["TeeTimeRateID", "TeeTimeRateId", "teeTimeRateId", "RateID"]) ?? startTime;
    const available =
      pickNumber(row, ["PlayerRule", "playerRule", "Vacancies", "AvailablePlayers"]) ??
      pickNumber(primaryRate, ["PlayersAvailable", "AvailablePlayers", "MaxPlayers"]);
    const price =
      pickNumber(primaryRate, ["Price", "DisplayRate", "GreenFee", "Rate"]) ??
      pickNumber(row, ["DisplayRate", "displayRate"]);
    const holes = pickNumber(primaryRate, ["HoleCount", "Holes"]) ?? pickNumber(row, ["HoleCount", "Holes"]);
    const facilityBooking =
      bookingUrl ||
      (facilityId ? `https://www.golfnow.com/tee-times/facility/${facilityId}` : undefined);

    results.push({
      provider: "golfnow",
      externalId: String(rateId),
      facilityId,
      facilityName: pickString(row, ["FacilityName", "facilityName"]),
      courseName: pickString(row, ["CourseName", "courseName", "FacilityName"]),
      startTime,
      timezone,
      availablePlayers: available,
      maxPlayers: available,
      holes: holes === 9 || holes === 18 ? holes : undefined,
      pricePerPlayer: price,
      currency: pickString(primaryRate, ["Currency", "currency"]) ?? "USD",
      cartIncluded: typeof primaryRate.CartIncluded === "boolean" ? primaryRate.CartIncluded : null,
      walkingAllowed: typeof primaryRate.WalkingAllowed === "boolean" ? primaryRate.WalkingAllowed : null,
      rateName: pickString(primaryRate, ["RateName", "rateName", "Name"]),
      rateType: pickString(primaryRate, ["RateType", "rateType"]),
      bookingUrl: facilityBooking,
      bookable: Boolean(facilityBooking),
    });
  }

  return results.filter((teeTime) => {
    if (input.players && teeTime.availablePlayers !== undefined && teeTime.availablePlayers < input.players) return false;
    if (input.holes && teeTime.holes && teeTime.holes !== input.holes) return false;
    return true;
  });
}

export class GolfNowProvider implements TeeTimeProvider {
  readonly id = "golfnow";

  constructor(
    private readonly credentials: GolfNowCredentials,
    private readonly options: { facilityId?: string; bookingUrl?: string } = {},
  ) {}

  async searchTeeTimes(input: TeeTimeSearchInput): Promise<TeeTimeSearchResult> {
    const facilityId = input.facilityId || this.options.facilityId;
    const { start, end } = toIsoDateRange(input.date, input.timeMin, input.timeMax);
    const channel = this.credentials.channelId;
    let path: string;
    if (facilityId) {
      const params = new URLSearchParams({
        "date-min": start,
        "date-max": end,
        take: "40",
      });
      path = `/channel/${channel}/facilities/${encodeURIComponent(facilityId)}/tee-times?${params.toString()}`;
    } else if (input.latitude != null && input.longitude != null) {
      const params = new URLSearchParams({
        q: "geo-location",
        latitude: String(input.latitude),
        longitude: String(input.longitude),
        proximity: "15",
        "date-min": start,
        "date-max": end,
        take: "40",
      });
      path = `/channel/${channel}/facilities/tee-times?${params.toString()}`;
    } else {
      return {
        teeTimes: [],
        provider: this.id,
        searchedAt: new Date().toISOString(),
        bookingUrl: this.options.bookingUrl,
        error: "not_configured",
        notice: "GolfNow is connected, but this course still needs a facility ID.",
      };
    }

    const response = await fetch(`${this.credentials.baseUrl}${path}`, {
      method: "GET",
      headers: authHeaders(this.credentials),
      signal: AbortSignal.timeout(12_000),
    });
    if (!response.ok) {
      throw new Error(`GOLFNOW_${response.status}`);
    }
    const payload = (await response.json()) as unknown;
    return {
      teeTimes: normalizeGolfNowTeeTimes(payload, input, this.options.bookingUrl),
      provider: this.id,
      searchedAt: new Date().toISOString(),
      bookingUrl: this.options.bookingUrl,
      notice: AVAILABILITY_NOTICE,
    };
  }
}
