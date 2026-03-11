import { describe, expect, it } from "vitest";
import { normalizeInitialData } from "@/data/normalize";

describe("normalizeInitialData", () => {
  it("normalizes Apps Script sheet rows into the frontend contract", () => {
    const data = normalizeInitialData({
      departments: [{ ID: "d1", Name: "Operations" }],
      employees: [
        {
          ID: "e1",
          Name: "Dana",
          Department: "Operations",
          Status: "reserve",
          ReserveEndDate: "2026-03-20",
        },
      ],
      vehicles: [{ Plate: "123", Status: "in_use", CurrentDriver: "Dana" }],
      equipmentTypes: [{ ID: "eq1", Name: "Generator", TotalQuantity: "3" }],
      equipmentLedger: [{ ID: "l1", EquipmentID: "eq1", Quantity: "1", IssuedTo: "Dana", Department: "Operations", IssueDate: "2026-03-11", Status: "issued" }],
      foodProducts: [{ ID: "f1", Name: "Rice", Category: "Dry" }],
      foodTransactions: [{ ID: "t1", Date: "2026-03-11", Type: "out", ProductID: "f1", Quantity: "2", DestinationApartmentId: "a1" }],
      apartments: [{ ID: "a1", Name: "Apartment A", LastSupplied: "2026-03-10" }],
      qualifications: [{ ID: "q1", Name: "License" }],
      employeeQualifications: [{ EmployeeID: "e1", QualificationID: "q1" }],
    });

    expect(data.employees[0].reserveEndDate).toBe("2026-03-20");
    expect(data.equipmentLedger[0].equipmentName).toBe("Generator");
    expect(data.foodTransactions[0].productName).toBe("Rice");
    expect(data.foodTransactions[0].destinationApartmentId).toBe("a1");
    expect(data.foodTransactions[0].destination).toBe("Apartment A");
  });

  it("accepts already-normalized frontend data", () => {
    const data = normalizeInitialData({
      departments: [{ id: "d1", name: "Operations" }],
      employees: [{ id: "e1", name: "Dana", department: "Operations", status: "active" }],
      vehicles: [{ plate: "123", status: "available" }],
      equipmentTypes: [{ id: "eq1", name: "Generator", totalQuantity: 3 }],
      equipmentLedger: [],
      foodProducts: [{ id: "f1", name: "Rice", category: "Dry" }],
      foodTransactions: [],
      apartments: [{ id: "a1", name: "Apartment A" }],
      qualifications: [{ id: "q1", name: "License" }],
      employeeQualifications: [],
    });

    expect(data.vehicles[0].plate).toBe("123");
    expect(data.foodProducts[0].name).toBe("Rice");
  });
});
