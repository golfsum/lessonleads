import { AVAILABILITY_NOTICE, type TeeTimeProvider, type TeeTimeSearchResult } from "../types";

export class CustomUrlProvider implements TeeTimeProvider {
  readonly id = "custom_url";

  constructor(private readonly bookingUrl: string) {}

  async searchTeeTimes(): Promise<TeeTimeSearchResult> {
    return {
      teeTimes: [],
      provider: this.id,
      searchedAt: new Date().toISOString(),
      bookingUrl: this.bookingUrl,
      notice: this.bookingUrl
        ? "Live availability isn't connected. You can still open the course tee sheet."
        : "No booking page is configured yet.",
    };
  }
}

export class StubProvider implements TeeTimeProvider {
  constructor(
    readonly id: string,
    private readonly bookingUrl?: string,
  ) {}

  async searchTeeTimes(): Promise<TeeTimeSearchResult> {
    return {
      teeTimes: [],
      provider: this.id,
      searchedAt: new Date().toISOString(),
      bookingUrl: this.bookingUrl,
      error: "not_configured",
      notice: this.bookingUrl
        ? "Live availability for this provider isn't connected yet. You can still view the course booking page."
        : "This provider is supported in the product architecture, but live API access is not configured.",
    };
  }
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export class DemoTeeTimeProvider implements TeeTimeProvider {
  readonly id = "demo";

  constructor(private readonly courseName = "North Course") {}

  async searchTeeTimes(input: { date: string; players: number; timeMin?: string; timezone?: string }): Promise<TeeTimeSearchResult> {
    const timezone = input.timezone || "America/Phoenix";
    const [year, month, day] = input.date.split("-").map(Number);
    const minParts = ((input.timeMin && input.timeMin > "07:30" ? input.timeMin : "08:00") ?? "08:00").split(":").map(Number);
    const start = new Date(year, (month ?? 1) - 1, day ?? 1, minParts[0] ?? 8, minParts[1] ?? 0);
    const times = [0, 18, 42].map((offset, index) => {
      const when = addMinutes(start, offset);
      return {
        provider: "demo",
        externalId: `demo-${input.date}-${index}`,
        courseName: index === 2 ? "South Course" : this.courseName,
        startTime: when.toISOString(),
        timezone,
        availablePlayers: 4,
        maxPlayers: 4,
        holes: 18 as const,
        pricePerPlayer: 62 + index * 6,
        currency: "USD",
        cartIncluded: index !== 1,
        walkingAllowed: true,
        rateName: index === 1 ? "Twilight preview" : "Standard",
        bookingUrl: "/demo/course",
        bookable: true,
        demo: true,
      };
    });
    return {
      teeTimes: times.filter((teeTime) => (teeTime.availablePlayers ?? 4) >= input.players),
      provider: this.id,
      searchedAt: new Date().toISOString(),
      demo: true,
      notice: `Demo availability. ${AVAILABILITY_NOTICE}`,
    };
  }
}
