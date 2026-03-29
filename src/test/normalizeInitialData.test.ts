import { describe, expect, it } from "vitest";
import { normalizeInitialData } from "@/data/normalize";

describe("normalizeInitialData", () => {
  it("normalizes Apps Script sheet rows into the frontend contract", () => {
    const data = normalizeInitialData({
      departments: [{ ID: "d1", Name: "Operations" }],
      drivingLicenses: [{ ID: "dl1", Name: "B" }],
      employees: [
        {
          ID: "e1",
          Name: "Dana",
          Department: "Operations",
          Status: "reserve",
          ReserveEndDate: "2026-03-20",
        },
      ],
      vehicles: [{ Plate: "123", VehicleType: "B", Status: "in_use", CurrentDriver: "Dana", DepartureLocation: "Base", TaskPurpose: "Supply", MissionType: "supply" }],
      vehicleTrips: [{ ID: "vt1", Plate: "123", VehicleType: "B", Driver: "Dana", DepartureLocation: "North", TaskPurpose: "Repair", MissionType: "fault", DepartureTime: "2026-03-11T08:00:00Z", ReturnTime: "2026-03-11T10:30:00Z", WorkHours: "2.5", TreatmentSummary: "Fixed the issue" }],
      campTasks: [{ ID: "ct1", Date: "2026-03-11", Department: "Operations", RequesterName: "Dana", ApprovingCommander: "Major Tal", Mission: "Camp inspection", TreatmentSummary: "Completed" }],
      equipmentTypes: [{ ID: "eq1", Name: "Generator", TotalQuantity: "3" }],
      equipmentLedger: [{ ID: "l1", EquipmentID: "eq1", Quantity: "1", IssuedTo: "Dana", EmployeeID: "e1", Department: "Operations", IssueDate: "2026-03-11", Status: "issued" }],
      foodProducts: [{ ID: "f1", Name: "Rice", Category: "Dry" }],
      foodTransactions: [{ ID: "t1", Date: "2026-03-11", Type: "out", ProductID: "f1", Quantity: "2", DestinationApartmentId: "a1" }],
      apartments: [{ ID: "a1", Name: "Apartment A", LastSupplied: "2026-03-10" }],
      qualifications: [{ ID: "q1", Name: "License" }],
      employeeQualifications: [{ EmployeeID: "e1", QualificationID: "q1" }],
      employeeDrivingLicenses: [{ EmployeeID: "e1", DrivingLicenseID: "dl1" }],
    });

    expect(data.employees[0].reserveEndDate).toBe("2026-03-20");
    expect(data.drivingLicenses[0].name).toBe("B");
    expect(data.vehicles[0].vehicleType).toBe("B");
    expect(data.vehicleTasks[0].missionType).toBe("fault");
    expect(data.vehicleTasks[0].workHours).toBe(2.5);
    expect(data.campTasks[0].requesterName).toBe("Dana");
    expect(data.campTasks[0].approvingCommander).toBe("Major Tal");
    expect(data.equipmentLedger[0].equipmentName).toBe("Generator");
    expect(data.equipmentLedger[0].employeeId).toBe("e1");
    expect(data.foodTransactions[0].productName).toBe("Rice");
    expect(data.foodTransactions[0].destinationApartmentId).toBe("a1");
    expect(data.foodTransactions[0].destination).toBe("Apartment A");
    expect(data.employeeDrivingLicenses[0].drivingLicenseId).toBe("dl1");
  });

  it("accepts already-normalized frontend data", () => {
    const data = normalizeInitialData({
      departments: [{ id: "d1", name: "Operations" }],
      drivingLicenses: [{ id: "dl1", name: "B" }],
      employees: [{ id: "e1", name: "Dana", department: "Operations", status: "active" }],
      vehicles: [{ plate: "123", vehicleType: "B", status: "available" }],
      vehicleTasks: [],
      campTasks: [],
      equipmentTypes: [{ id: "eq1", name: "Generator", totalQuantity: 3 }],
      equipmentLedger: [],
      foodProducts: [{ id: "f1", name: "Rice", category: "Dry" }],
      foodTransactions: [],
      apartments: [{ id: "a1", name: "Apartment A" }],
      qualifications: [{ id: "q1", name: "License" }],
      employeeQualifications: [],
      employeeDrivingLicenses: [],
    });

    expect(data.vehicles[0].plate).toBe("123");
    expect(data.drivingLicenses[0].name).toBe("B");
    expect(data.vehicles[0].vehicleType).toBe("B");
    expect(data.foodProducts[0].name).toBe("Rice");
  });
});
