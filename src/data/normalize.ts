import {
  Apartment,
  CampTask,
  Department,
  DrivingLicense,
  Employee,
  EmployeeQualification,
  EmployeeDrivingLicense,
  EquipmentLedgerEntry,
  EquipmentType,
  FoodProduct,
  FoodTransaction,
  InitialData,
  Qualification,
  Vehicle,
  VehicleTask,
} from "@/types";

type RawRow = Record<string, unknown>;

function asRows(value: unknown): RawRow[] {
  return Array.isArray(value) ? value.filter((item): item is RawRow => !!item && typeof item === "object") : [];
}

function readValue(row: RawRow, keys: string[]): unknown {
  for (const key of keys) {
    if (key in row) return row[key];
  }
  return undefined;
}

function readString(row: RawRow, keys: string[], fallback = ""): string {
  const value = readValue(row, keys);
  if (value === undefined || value === null) return fallback;
  return String(value).trim();
}

function readOptionalString(row: RawRow, keys: string[]): string | undefined {
  const value = readString(row, keys, "");
  return value ? value : undefined;
}

function readNumber(row: RawRow, keys: string[], fallback = 0): number {
  const value = readValue(row, keys);
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function normalizeVehicleStatus(status?: string): Vehicle["status"] {
  if (status === "available" || status === "in_use" || status === "maintenance") {
    return status;
  }
  return "available";
}

function normalizeEmployeeStatus(status?: string): Employee["status"] {
  if (status === "active" || status === "reserve" || status === "inactive") {
    return status;
  }
  return "active";
}

function normalizeEquipmentStatus(status?: string): EquipmentLedgerEntry["status"] {
  if (status === "issued" || status === "returned" || status === "overdue") {
    return status;
  }
  return "issued";
}

function normalizeFoodTransactionType(type?: string): FoodTransaction["type"] {
  return type === "out" ? "out" : "in";
}

function normalizeMissionType(value?: string): VehicleTask["missionType"] {
  if (value === "supply" || value === "fault" || value === "other") {
    return value;
  }
  return "other";
}

export function normalizeInitialData(raw: unknown): InitialData {
  const source = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

  const departments: Department[] = asRows(source.departments).map((row) => ({
    id: readString(row, ["id", "ID"]),
    name: readString(row, ["name", "Name"]),
  })).sort((a, b) => a.name.localeCompare(b.name, "he"));

  const drivingLicenses: DrivingLicense[] = asRows(source.drivingLicenses).map((row) => ({
    id: readString(row, ["id", "ID"]),
    name: readString(row, ["name", "Name"]),
  })).sort((a, b) => a.name.localeCompare(b.name, "he"));

  const apartments: Apartment[] = asRows(source.apartments).map((row) => ({
    id: readString(row, ["id", "ID"]),
    name: readString(row, ["name", "Name"]),
    lastSupplied: readOptionalString(row, ["lastSupplied", "LastSupplied"]),
  }));

  const foodProducts: FoodProduct[] = asRows(source.foodProducts).map((row) => ({
    id: readString(row, ["id", "ID"]),
    name: readString(row, ["name", "Name"]),
    category: readString(row, ["category", "Category"]),
    department: readOptionalString(row, ["department", "Department"]),
  }));

  const qualifications: Qualification[] = asRows(source.qualifications).map((row) => ({
    id: readString(row, ["id", "ID"]),
    name: readString(row, ["name", "Name"]),
  }));

  const equipmentTypes: EquipmentType[] = asRows(
    source.equipmentTypes ?? source.equipmentCatalog
  ).map((row) => ({
    id: readString(row, ["id", "ID"]),
    name: readString(row, ["name", "Name"]),
    totalQuantity: readNumber(row, ["totalQuantity", "TotalQuantity"]),
  }));

  const equipmentNameById = new Map(equipmentTypes.map((item) => [item.id, item.name]));
  const apartmentNameById = new Map(apartments.map((item) => [item.id, item.name]));
  const productNameById = new Map(foodProducts.map((item) => [item.id, item.name]));

  const employees: Employee[] = asRows(source.employees).map((row) => ({
    id: readString(row, ["id", "ID"]),
    name: readString(row, ["name", "Name"]),
    department: readString(row, ["department", "Department"]),
    status: normalizeEmployeeStatus(readOptionalString(row, ["status", "Status"])),
    reserveStartDate: readOptionalString(row, ["reserveStartDate", "ReserveStartDate"]),
    reserveEndDate: readOptionalString(row, ["reserveEndDate", "ReserveEndDate"]),
    phone: readOptionalString(row, ["phone", "Phone"]),
    role: readOptionalString(row, ["role", "Role"]),
  }));

  const vehicles: Vehicle[] = asRows(source.vehicles).map((row) => ({
    plate: readString(row, ["plate", "Plate"]),
    vehicleType: readOptionalString(row, ["vehicleType", "VehicleType"]),
    status: normalizeVehicleStatus(readOptionalString(row, ["status", "Status"])),
    currentDriver: readOptionalString(row, ["currentDriver", "CurrentDriver"]),
    departureLocation: readOptionalString(row, [
      "departureLocation",
      "DepartureLocation",
      "origin",
      "Origin",
    ]),
    taskPurpose: readOptionalString(row, [
      "taskPurpose",
      "TaskPurpose",
      "destination",
      "Destination",
    ]),
    missionType: normalizeMissionType(readOptionalString(row, ["missionType", "MissionType"])),
    requesterName: readOptionalString(row, ["requesterName", "RequesterName"]),
    requestingDepartment: readOptionalString(row, [
      "requestingDepartment",
      "RequestingDepartment",
    ]),
    departureTime: readOptionalString(row, ["departureTime", "DepartureTime"]),
    notes: readOptionalString(row, ["notes", "Notes"]),
  }));

  const vehicleTasks: VehicleTask[] = asRows(
    source.vehicleTasks ?? source.vehicleTrips
  ).map((row) => {
    const workHours = readNumber(row, ["workHours", "WorkHours"], NaN);

    return {
      id: readString(row, ["id", "ID"]),
      plate: readString(row, ["plate", "Plate"]),
      vehicleType: readOptionalString(row, ["vehicleType", "VehicleType"]),
      driver: readString(row, ["driver", "Driver"]),
      departureLocation: readString(row, [
        "departureLocation",
        "DepartureLocation",
        "location",
        "Location",
        "destination",
        "Destination",
        "origin",
        "Origin",
      ]),
      taskPurpose: readString(row, [
        "taskPurpose",
        "TaskPurpose",
        "mission",
        "Mission",
        "destination",
        "Destination",
      ]),
      missionType: normalizeMissionType(readOptionalString(row, ["missionType", "MissionType"])),
      requesterName: readOptionalString(row, ["requesterName", "RequesterName"]),
      requestingDepartment: readOptionalString(row, [
        "requestingDepartment",
        "RequestingDepartment",
        "department",
        "Department",
      ]),
      departureTime: readString(row, ["departureTime", "DepartureTime"]),
      returnTime: readOptionalString(row, ["returnTime", "ReturnTime"]),
      workHours: Number.isFinite(workHours) ? workHours : undefined,
      treatmentSummary: readOptionalString(row, ["treatmentSummary", "TreatmentSummary"]),
    };
  });

  const campTasks: CampTask[] = asRows(source.campTasks).map((row) => ({
    id: readString(row, ["id", "ID"]),
    date: readString(row, ["date", "Date"]),
    department: readOptionalString(row, ["department", "Department"]),
    requesterName: readString(row, ["requesterName", "RequesterName"]),
    approvingCommander: readOptionalString(row, ["approvingCommander", "ApprovingCommander"]),
    mission: readString(row, ["mission", "Mission"]),
    treatmentSummary: readOptionalString(row, ["treatmentSummary", "TreatmentSummary"]),
  }));

  const equipmentLedger: EquipmentLedgerEntry[] = asRows(source.equipmentLedger).map((row) => {
    const equipmentId = readString(row, ["equipmentId", "EquipmentID"]);

    return {
      id: readString(row, ["id", "ID"]),
      equipmentId,
      equipmentName:
        readString(row, ["equipmentName", "EquipmentName"], "") ||
        equipmentNameById.get(equipmentId) ||
        equipmentId,
      quantity: readNumber(row, ["quantity", "Quantity"]),
      issuedTo: readString(row, ["issuedTo", "IssuedTo"]),
      employeeId: readOptionalString(row, ["employeeId", "EmployeeID"]),
      department: readString(row, ["department", "Department"]),
      issueDate: readString(row, ["issueDate", "IssueDate"]),
      expectedReturnDate: readOptionalString(row, ["expectedReturnDate", "ExpectedReturnDate"]),
      returnDate: readOptionalString(row, ["returnDate", "ReturnDate"]),
      status: normalizeEquipmentStatus(readOptionalString(row, ["status", "Status"])),
    };
  });

  const foodTransactions: FoodTransaction[] = asRows(source.foodTransactions).map((row) => {
    const productId = readString(row, ["productId", "ProductID"]);
    const destinationApartmentId = readOptionalString(row, [
      "destinationApartmentId",
      "DestinationApartmentId",
      "apartmentId",
      "ApartmentID",
    ]);
    const destinationName =
      readOptionalString(row, ["destination", "Destination", "destinationName", "DestinationName"]) ||
      (destinationApartmentId ? apartmentNameById.get(destinationApartmentId) : undefined);

    return {
      id: readString(row, ["id", "ID"]),
      date: readString(row, ["date", "Date"]),
      type: normalizeFoodTransactionType(readOptionalString(row, ["type", "Type"])),
      productId,
      productName:
        readString(row, ["productName", "ProductName"], "") ||
        productNameById.get(productId) ||
        productId,
      quantity: readNumber(row, ["quantity", "Quantity"]),
      destinationApartmentId,
      destination: destinationName,
    };
  });

  const employeeQualifications: EmployeeQualification[] = asRows(
    source.employeeQualifications
  ).map((row) => ({
    employeeId: readString(row, ["employeeId", "EmployeeID"]),
    qualificationId: readString(row, ["qualificationId", "QualificationID"]),
  }));

  const employeeDrivingLicenses: EmployeeDrivingLicense[] = asRows(
    source.employeeDrivingLicenses
  ).map((row) => ({
    employeeId: readString(row, ["employeeId", "EmployeeID"]),
    drivingLicenseId: readString(row, ["drivingLicenseId", "DrivingLicenseID"]),
  }));

  return {
    employees,
    departments,
    drivingLicenses,
    vehicles,
    vehicleTasks,
    campTasks,
    equipmentTypes,
    equipmentLedger,
    foodProducts,
    foodTransactions,
    apartments,
    qualifications,
    employeeQualifications,
    employeeDrivingLicenses,
  };
}
