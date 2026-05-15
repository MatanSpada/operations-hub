import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { normalizeInitialData } from "@/data/normalize";
import { SettingsPage } from "@/modules/settings/SettingsPage";

const { updateVehicleDetailed } = vi.hoisted(() => ({
  updateVehicleDetailed: vi.fn(),
}));
const { updateEmployeeDetailed } = vi.hoisted(() => ({
  updateEmployeeDetailed: vi.fn(),
}));

vi.mock("@/api", () => ({
  api: {
    updateEmployeeDetailed,
    updateVehicleDetailed,
  },
}));

function buildSettingsData() {
  return normalizeInitialData({
    departments: [{ ID: "d1", Name: "לוגיסטיקה" }],
    drivingLicenses: [
      { ID: "dl1", Name: "C1" },
      { ID: "dl2", Name: "B" },
    ],
    employees: [
      {
        ID: "e1",
        Name: "עובד בדיקה",
        Department: "לוגיסטיקה",
        Status: "active",
        Phone: "050-1234567",
        Role: "נהג",
      },
    ],
    vehicles: [
      {
        Plate: "123-45-678",
        VehicleType: "C1",
        Status: "available",
        CurrentDriver: "",
        DepartureLocation: "",
        TaskPurpose: "",
        MissionType: "",
        RequesterName: "",
        RequestingDepartment: "",
        DepartureTime: "",
        Notes: "רכב בדיקה",
      },
    ],
    vehicleTasks: [],
    campTasks: [],
    equipmentTypes: [],
    equipmentLedger: [],
    foodProducts: [],
    foodTransactions: [],
    apartments: [],
    qualifications: [{ ID: "q1", Name: "הכשרה א" }],
    employeeQualifications: [{ EmployeeID: "e1", QualificationID: "q1" }],
    employeeDrivingLicenses: [{ EmployeeID: "e1", DrivingLicenseID: "dl1" }],
  });
}

describe("SettingsPage vehicles editing", () => {
  beforeEach(() => {
    updateVehicleDetailed.mockReset();
    updateVehicleDetailed.mockResolvedValue({ data: { plate: "987-65-432" } });
    updateEmployeeDetailed.mockReset();
    updateEmployeeDetailed.mockResolvedValue({ data: true });
  });

  it("keeps employee row editing available and removes the row-click hint text", () => {
    render(<SettingsPage data={buildSettingsData()} onRefresh={vi.fn()} />);

    expect(screen.queryByText("לחיצה על השורה לעריכה")).not.toBeInTheDocument();

    const employeeTable = screen.getByRole("table");
    const employeeRow = within(employeeTable).getAllByRole("row")[1];
    fireEvent.click(employeeRow);

    expect(screen.getByRole("heading", { name: "עריכת עובד: עובד בדיקה" })).toBeInTheDocument();
  });

  it("opens a vehicle edit modal from the Data Management vehicles table and persists changes", async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);
    render(<SettingsPage data={buildSettingsData()} onRefresh={onRefresh} />);

    fireEvent.click(screen.getByRole("button", { name: "רכבים" }));

    const table = screen.getByRole("table");
    const vehicleRow = within(table).getAllByRole("row")[1];
    fireEvent.click(vehicleRow);

    expect(screen.getByRole("heading", { name: "עריכת רכב: 123-45-678" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("לוחית רישוי"), {
      target: { value: "987-65-432" },
    });
    fireEvent.change(screen.getByLabelText("הערות"), {
      target: { value: "הערה חדשה" },
    });
    fireEvent.change(screen.getByLabelText("סוג רכב"), {
      target: { value: "B" },
    });

    fireEvent.click(screen.getByRole("button", { name: "שמור שינויים" }));

    await waitFor(() => {
      expect(updateVehicleDetailed).toHaveBeenCalledWith({
        originalPlate: "123-45-678",
        plate: "987-65-432",
        vehicleType: "B",
        notes: "הערה חדשה",
      });
    });
    await waitFor(() => {
      expect(onRefresh).toHaveBeenCalled();
    });
  });
});
