import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { normalizeInitialData } from "@/data/normalize";
import { SettingsPage } from "@/modules/settings/SettingsPage";

const { updateVehicleDetailed } = vi.hoisted(() => ({
  updateVehicleDetailed: vi.fn(),
}));

vi.mock("@/api", () => ({
  api: {
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
    employees: [],
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
    qualifications: [],
    employeeQualifications: [],
    employeeDrivingLicenses: [],
  });
}

describe("SettingsPage vehicles editing", () => {
  beforeEach(() => {
    updateVehicleDetailed.mockReset();
    updateVehicleDetailed.mockResolvedValue({ data: { plate: "987-65-432" } });
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
