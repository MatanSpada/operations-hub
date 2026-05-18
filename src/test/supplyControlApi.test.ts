import { describe, expect, it } from "vitest";
import {
  isSupplyRowActive,
  mapSheetRowsByHeaders,
  normalizeSupplyReportDetails,
  normalizeSupplyReportsByApartment,
} from "@/modules/apartment-supply-control/normalize";

describe("apartment supply control normalization", () => {
  it("maps sheet rows to objects by headers", () => {
    expect(
      mapSheetRowsByHeaders([
        ["apartment_id", "location", "active"],
        ["apt-1", "בניין א", "TRUE"],
      ]),
    ).toEqual([
      {
        apartment_id: "apt-1",
        location: "בניין א",
        active: "TRUE",
      },
    ]);
  });

  it("parses active values robustly", () => {
    expect(isSupplyRowActive(true)).toBe(true);
    expect(isSupplyRowActive("TRUE")).toBe(true);
    expect(isSupplyRowActive("true")).toBe(true);
    expect(isSupplyRowActive("1")).toBe(true);
    expect(isSupplyRowActive(1)).toBe(true);
    expect(isSupplyRowActive("FALSE")).toBe(false);
    expect(isSupplyRowActive("0")).toBe(false);
  });

  it("sorts reports newest first and applies the default limit of 30", () => {
    const rows = Array.from({ length: 35 }, (_, index) => ({
      report_id: `r-${index + 1}`,
      apartment_id: "apt-1",
      reported_at: `2026-05-${String((index % 28) + 1).padStart(2, "0")}T${String(index % 24).padStart(2, "0")}:00:00Z`,
      overall_status: "ok",
    }));

    const result = normalizeSupplyReportsByApartment(rows, "apt-1");

    expect(result.total).toBe(35);
    expect(result.limit).toBe(30);
    expect(result.page).toBe(1);
    expect(result.reports).toHaveLength(30);

    const timestamps = result.reports.map((report) => Date.parse(report.reported_at));
    expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
  });

  it("supports paging for reports by apartment", () => {
    const rows = Array.from({ length: 35 }, (_, index) => ({
      report_id: `r-${index + 1}`,
      apartment_id: "apt-1",
      reported_at: new Date(Date.UTC(2026, 3, index + 1, 8, 0, 0)).toISOString(),
      overall_status: "ok",
    }));

    const result = normalizeSupplyReportsByApartment(rows, "apt-1", { page: 2, limit: 30 });

    expect(result.reports).toHaveLength(5);
    expect(result.reports[0].report_id).toBe("r-5");
    expect(result.reports[4].report_id).toBe("r-1");
  });

  it("combines report details with apartment, items, and photos", () => {
    const details = normalizeSupplyReportDetails({
      report: {
        report_id: "rep-1",
        apartment_id: "apt-1",
        reporter_initials: "אב",
        reported_at: "2026-05-18T09:00:00Z",
        overall_status: "partial",
      },
      apartment: {
        apartment_id: "apt-1",
        location: "קומה 2",
        mission: "פלוגה א",
        type: "קצינים",
        active: "TRUE",
      },
      items: [
        {
          report_item_id: "item-1",
          report_id: "rep-1",
          standard_item_id: "std-1",
          item_name: "מקרר",
          required_value: "1",
          reported_status: "ok",
          actual_value: "1",
        },
      ],
      photos: [
        {
          photo_id: "photo-1",
          report_id: "rep-1",
          apartment_id: "apt-1",
          category: "מקרר",
          drive_url: "https://drive.google.com/file/d/123/view",
        },
      ],
    });

    expect(details).not.toBeNull();
    expect(details?.report.report_id).toBe("rep-1");
    expect(details?.apartment.location).toBe("קומה 2");
    expect(details?.items[0].reported_status).toBe("ok");
    expect(details?.photos[0].category).toBe("מקרר");
  });
});
