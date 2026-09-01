export type TeeTimeSearchInput = {
  organizationId: string;
  locationId?: string;
  date: string;
  players: number;
  timeMin?: string;
  timeMax?: string;
  holes?: 9 | 18;
  facilityId?: string;
  latitude?: number;
  longitude?: number;
  timezone?: string;
};

export type TeeTime = {
  provider: string;
  externalId: string;
  facilityId?: string;
  facilityName?: string;
  courseName?: string;
  startTime: string;
  timezone: string;
  availablePlayers?: number;
  minPlayers?: number;
  maxPlayers?: number;
  holes?: number;
  pricePerPlayer?: number;
  currency?: string;
  cartIncluded?: boolean | null;
  walkingAllowed?: boolean | null;
  rateName?: string;
  rateType?: string;
  bookingUrl?: string;
  bookable: boolean;
  demo?: boolean;
  raw?: Record<string, unknown>;
};

export type TeeTimeSearchResult = {
  teeTimes: TeeTime[];
  provider: string;
  searchedAt: string;
  demo?: boolean;
  bookingUrl?: string;
  notice?: string;
  error?: "provider_unavailable" | "not_configured" | "invalid_request";
};

export type BookingInput = {
  teeTimeId: string;
  players: number;
  golfer: {
    firstName: string;
    lastName?: string;
    email: string;
    phone?: string;
  };
};

export type BookingResult = {
  mode: "handoff" | "direct";
  bookingUrl?: string;
  confirmationId?: string;
};

export interface TeeTimeProvider {
  readonly id: string;
  searchTeeTimes(input: TeeTimeSearchInput): Promise<TeeTimeSearchResult>;
  getTeeTimeDetails?(id: string): Promise<TeeTime>;
  createBooking?(input: BookingInput): Promise<BookingResult>;
}

export const AVAILABILITY_NOTICE = "Availability can change until booking is completed.";
