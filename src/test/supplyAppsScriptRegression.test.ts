import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const codeGsPath = resolve(process.cwd(), "src/apps-script/Code.gs");
const codeGs = readFileSync(codeGsPath, "utf8");

describe("supply Apps Script regression guards", () => {
  it("keeps the supply actions registered", () => {
    [
      "supply_get_apartments",
      "supply_get_apartment",
      "supply_get_standard_items",
      "supply_get_reports_by_apartment",
      "supply_get_report_details",
      "supply_create_apartment",
      "supply_update_apartment",
      "supply_deactivate_apartment",
      "supply_create_standard_item",
      "supply_update_standard_item",
      "supply_deactivate_standard_item",
      "supply_seed_demo_data",
    ].forEach((action) => {
      expect(codeGs).toContain(`"${action}"`);
    });
  });

  it("defines the header helper used by supply row writes", () => {
    expect(codeGs).toContain("function getSheetHeaders_(sheet)");
    expect(codeGs).toContain("const headers = getSheetHeaders_(sheet);");
  });
});
