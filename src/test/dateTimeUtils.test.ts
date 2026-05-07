import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  buildExportFile,
  buildPdfPagePlans,
  buildZipBlob,
  compareDateOnlyValues,
  combineDateAndTimeToIso,
  computeDurationHours,
  formatDate,
  formatDateShort,
  formatDateTime,
  inDateRange,
  normalizeDateOnlyString,
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

  it("normalizes and compares date-only values by chronology instead of text shape", () => {
    expect(normalizeDateOnlyString("15/04/26")).toBe("2026-04-15");
    expect(normalizeDateOnlyString("Tue Apr 28 2026 00:00:00 GMT+0300")).toBe("2026-04-28");
    expect(compareDateOnlyValues("2026-05-05", "15/04/26")).toBeGreaterThan(0);
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

  it("builds a real xlsx export with serial numbering and rtl workbook metadata", async () => {
    const file = await buildExportFile(
      {
        filenameBase: "employees",
        title: "עובדים",
        worksheetName: "עובדים",
        rows: [["שם", "מחלקה"], ["דנה", "תפעול"]],
      },
      "excel"
    );

    expect(file.filename).toBe("employees.xlsx");
    expect(file.bytes).toBeInstanceOf(Uint8Array);

    const workbook = XLSX.read(file.bytes, { type: "array" });
    expect(workbook.Workbook?.Views?.[0]?.RTL).toBe(true);
    expect(workbook.SheetNames).toEqual(["עובדים"]);

    const sheetRows = XLSX.utils.sheet_to_json<(string | number)[]>(
      workbook.Sheets["עובדים"],
      { header: 1 }
    );
    expect(sheetRows[0]).toEqual(["מספר סידורי", "שם", "מחלקה"]);
    expect(sheetRows[1]).toEqual(["1", "דנה", "תפעול"]);
  });

  it("splits pdf pages only between whole rows", () => {
    const plans = buildPdfPagePlans(
      [40, 40, 60, 35, 35],
      30,
      70,
      215
    );

    expect(plans).toEqual([
      { rowStart: 0, rowEndExclusive: 2, includeTitle: true },
      { rowStart: 2, rowEndExclusive: 5, includeTitle: false },
    ]);
  });
});
