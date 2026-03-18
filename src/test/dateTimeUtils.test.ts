import { describe, expect, it } from "vitest";
import {
  combineDateAndTimeToIso,
  computeDurationHours,
  formatDate,
  formatDateTime,
  inDateRange,
} from "@/utils";

describe("date/time utilities", () => {
  it("formats dates and datetimes in Israeli order with 24-hour time", () => {
    expect(formatDate("2026-03-19")).toBe("19/03/2026");
    expect(formatDateTime("2026-03-19T18:05:00")).toBe("19/03/2026 18:05");
  });

  it("combines local date and time and computes duration across midnight", () => {
    const start = combineDateAndTimeToIso("2026-03-19", "23:30");
    const end = combineDateAndTimeToIso("2026-03-20", "01:00");

    expect(start).toBeTruthy();
    expect(end).toBeTruthy();
    expect(computeDurationHours(start ?? undefined, end ?? undefined)).toBe(1.5);
  });

  it("filters report dates using local date keys rather than raw utc prefixes", () => {
    const iso = combineDateAndTimeToIso("2026-03-20", "00:30");
    expect(iso).toBeTruthy();
    expect(inDateRange(iso ?? undefined, "2026-03-20", "2026-03-20")).toBe(true);
  });
});
