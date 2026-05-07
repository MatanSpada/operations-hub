import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { normalizeInitialData } from "@/data/normalize";
import { MissionsPage } from "@/modules/missions/MissionsPage";

function buildMissionsData() {
  return normalizeInitialData({
    departments: [
      { ID: "d1", Name: "אחזקה" },
      { ID: "d2", Name: "לוגיסטיקה" },
      { ID: "d3", Name: "מבצעים" },
    ],
    drivingLicenses: [],
    employees: [],
    vehicles: [],
    vehicleTasks: [],
    campTasks: [
      { ID: "ct1", Date: "15/04/26", Department: "לוגיסטיקה", RequesterName: "א", ApprovingCommander: "מפקד ב", Mission: "משימה 1" },
      { ID: "ct2", Date: "2026-04-01", Department: "אחזקה", RequesterName: "ב", ApprovingCommander: "", Mission: "משימה 2" },
      { ID: "ct3", Date: "2026-05-05", Department: "מבצעים", RequesterName: "ג", ApprovingCommander: "מפקד א", Mission: "משימה 3" },
      { ID: "ct4", Date: "Tue Apr 28 2026 00:00:00 GMT+0300", Department: "אחזקה", RequesterName: "ד", ApprovingCommander: "מפקד ג", Mission: "משימה 4" },
      { ID: "ct5", Date: "2026-04-21", Department: "מבצעים", RequesterName: "ה", ApprovingCommander: "מפקד ד", Mission: "משימה 5" },
    ],
    equipmentTypes: [],
    equipmentLedger: [],
    foodProducts: [],
    foodTransactions: [],
    apartments: [],
    qualifications: [],
    employeeQualifications: [],
    employeeDrivingLicenses: [],
  });
}

function getTableRows() {
  const table = screen.getByRole("table");
  return within(table).getAllByRole("row").slice(1);
}

function getColumnTexts(columnIndex: number) {
  return getTableRows().map((row) => within(row).getAllByRole("cell")[columnIndex].textContent?.trim() ?? "");
}

function expandMissionDateRange() {
  fireEvent.change(screen.getByLabelText("מתאריך"), { target: { value: "2026-04-01" } });
  fireEvent.change(screen.getByLabelText("עד תאריך"), { target: { value: "2026-05-31" } });
}

describe("MissionsPage", () => {
  it("keeps the default mission order chronological by real date and exposes only the intended sort headers", () => {
    render(<MissionsPage data={buildMissionsData()} onRefresh={vi.fn()} />);
    expandMissionDateRange();

    expect(getColumnTexts(0)).toEqual([
      "05/05/26",
      "28/04/26",
      "21/04/26",
      "15/04/26",
      "01/04/26",
    ]);

    expect(screen.getByRole("table")).toHaveAttribute("dir", "rtl");
    const headerRow = within(screen.getByRole("table")).getAllByRole("row")[0];
    expect(within(headerRow).getAllByRole("button")).toHaveLength(3);
  });

  it("sorts by date, department, and approving commander with stable fallbacks", () => {
    render(<MissionsPage data={buildMissionsData()} onRefresh={vi.fn()} />);
    expandMissionDateRange();

    fireEvent.click(screen.getByRole("button", { name: "מחלקה" }));
    expect(getColumnTexts(1)).toEqual([
      "אחזקה",
      "אחזקה",
      "לוגיסטיקה",
      "מבצעים",
      "מבצעים",
    ]);
    expect(getColumnTexts(0)).toEqual([
      "28/04/26",
      "01/04/26",
      "15/04/26",
      "05/05/26",
      "21/04/26",
    ]);

    fireEvent.click(screen.getByRole("button", { name: "מפקד מאשר" }));
    expect(getColumnTexts(3)).toEqual([
      "מפקד א",
      "מפקד ב",
      "מפקד ג",
      "מפקד ד",
      "—",
    ]);

    const dateButton = screen.getByRole("button", { name: "תאריך" });
    fireEvent.click(dateButton);
    fireEvent.click(dateButton);
    expect(getColumnTexts(0)).toEqual([
      "01/04/26",
      "15/04/26",
      "21/04/26",
      "28/04/26",
      "05/05/26",
    ]);
  });
});
