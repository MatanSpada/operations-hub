import { describe, expect, it } from "vitest";
import {
  buildZipBlob,
  combineDateAndTimeToIso,
  computeDurationHours,
  formatDate,
  formatDateShort,
  formatDateTime,
  inDateRange,
  withSerialColumn,
} from "@/utils";

describe("date/time utilities", () => {
  it("formats dates and datetimes in Israeli order with 24-hour time", () => {
    expect(formatDate("2026-03-19")).toBe("19/03/2026");
    expect(formatDateShort("2026-03-19")).toBe("19/03/26");
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

  it("adds serial numbering to exported rows and can package files as zip", async () => {
    const rows = withSerialColumn([
      ["שם", "מחלקה"],
      ["דנה", "תפעול"],
      ["נועם", "לוגיסטיקה"],
    ]);

    expect(rows).toEqual([
      ["מספר סידורי", "שם", "מחלקה"],
      ["1", "דנה", "תפעול"],
      ["2", "נועם", "לוגיסטיקה"],
    ]);

    const zipBlob = buildZipBlob([{ filename: "employees.csv", rows: [["שם"], ["דנה"]] }]);
    expect(zipBlob.type).toBe("application/zip");
    expect(zipBlob.size).toBeGreaterThan(0);
  });
});
