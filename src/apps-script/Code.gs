/**
 * src/apps-script/Code.gs
 * =======================
 * Google Apps Script backend for the Operations Hub dashboard.
 *
 * Recommended sheet headers:
 * Departments: ID, Name
 * Driving_Licenses: ID, Name
 * Employees: ID, Name, Department, Status, ReserveStartDate, ReserveEndDate, Phone, Role
 * Vehicles: Plate, VehicleType, Status, CurrentDriver, DepartureLocation, TaskPurpose, MissionType, RequesterName, RequestingDepartment, DepartureTime, Notes
 * Vehicle_Trips: ID, Plate, VehicleType, Driver, DepartureLocation, TaskPurpose, MissionType, RequesterName, RequestingDepartment, DepartureTime, ReturnTime, WorkHours, TreatmentSummary
 * Camp_Tasks: ID, Date, Department, RequesterName, Mission, TreatmentSummary
 * Equipment_Catalog: ID, Name, TotalQuantity
 * Equipment_Ledger: ID, EquipmentID, EquipmentName, Quantity, IssuedTo, Department, IssueDate, ExpectedReturnDate, ReturnDate, Status
 * Food_Catalog: ID, Name, Category, Department
 * Food_Transactions: ID, Date, Type, ProductID, ProductName, Quantity, DestinationApartmentId, DestinationName
 * Apartments: ID, Name, LastSupplied
 * Qualifications: ID, Name
 * Employee_Qualifications: EmployeeID, QualificationID
 */

const SHEETS = {
  EMPLOYEES: "Employees",
  DEPARTMENTS: "Departments",
  DRIVING_LICENSES: "Driving_Licenses",
  VEHICLES: "Vehicles",
  VEHICLE_TRIPS: "Vehicle_Trips",
  CAMP_TASKS: "Camp_Tasks",
  EQUIPMENT_CATALOG: "Equipment_Catalog",
  EQUIPMENT_LEDGER: "Equipment_Ledger",
  FOOD_CATALOG: "Food_Catalog",
  FOOD_TRANSACTIONS: "Food_Transactions",
  APARTMENTS: "Apartments",
  QUALIFICATIONS: "Qualifications",
  EMPLOYEE_QUALIFICATIONS: "Employee_Qualifications",
};

function doGet(e) {
  const action = e && e.parameter ? e.parameter.action : "";

  try {
    if (action === "getInitialData") {
      return jsonResponse_({
        success: true,
        data: buildInitialData_(),
      });
    }

    return jsonResponse_({ success: false, error: "Unknown action: " + action });
  } catch (err) {
    return jsonResponse_({ success: false, error: String(err) });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents || "{}");
    const action = payload.action;

    if (action === "createDepartment") {
      return createDepartment_(payload);
    }
    if (action === "deleteDepartment") {
      return deleteDepartment_(payload);
    }
    if (action === "createQualification") {
      return createQualification_(payload);
    }
    if (action === "deleteQualification") {
      return deleteQualification_(payload);
    }
    if (action === "createDrivingLicense") {
      return createDrivingLicense_(payload);
    }
    if (action === "deleteDrivingLicense") {
      return deleteDrivingLicense_(payload);
    }
    if (action === "createVehicle") {
      return createVehicle_(payload);
    }
    if (action === "createCampTask") {
      return createCampTask_(payload);
    }
    if (action === "deleteVehicle") {
      return deleteVehicle_(payload);
    }
    if (action === "createEmployee") {
      return createEmployee_(payload);
    }
    if (action === "deleteEmployee") {
      return deleteEmployee_(payload);
    }

    if (action === "checkoutVehicle") {
      const missionType = normalizeMissionType_(payload.missionType);
      updateRow_(SHEETS.VEHICLES, "Plate", payload.plate, {
        Status: "in_use",
        CurrentDriver: payload.driver,
        DepartureLocation: payload.departureLocation,
        TaskPurpose: payload.taskPurpose,
        MissionType: missionType,
        RequesterName: payload.requesterName || "",
        RequestingDepartment: payload.requestingDepartment || "",
        DepartureTime: payload.departureTime,
      });
      appendRow_(SHEETS.VEHICLE_TRIPS, {
        ID: generateId_(),
        Plate: payload.plate,
        VehicleType: getVehicleType_(payload.plate),
        Driver: payload.driver,
        DepartureLocation: payload.departureLocation,
        TaskPurpose: payload.taskPurpose,
        MissionType: missionType,
        RequesterName: payload.requesterName || "",
        RequestingDepartment: payload.requestingDepartment || "",
        DepartureTime: payload.departureTime,
        ReturnTime: "",
        WorkHours: "",
        TreatmentSummary: "",
      });
      return jsonResponse_({ success: true });
    }

    if (action === "returnVehicle") {
      updateRow_(SHEETS.VEHICLES, "Plate", payload.plate, {
        Status: "available",
        CurrentDriver: "",
        DepartureLocation: "",
        TaskPurpose: "",
        MissionType: "",
        RequesterName: "",
        RequestingDepartment: "",
        DepartureTime: "",
      });
      closeLatestVehicleTrip_(payload.plate, payload);
      return jsonResponse_({ success: true });
    }

    if (action === "updateVehicleStatus") {
      updateRow_(SHEETS.VEHICLES, "Plate", payload.plate, { Status: payload.status });
      return jsonResponse_({ success: true });
    }

    if (action === "issueEquipment") {
      const equipmentId = String(payload.equipmentId || "").trim();
      const quantity = Number(payload.quantity || 0);
      const equipment = getEquipmentTypeById_(equipmentId);

      if (!equipmentId) {
        throw new Error("Missing equipment ID");
      }
      if (!equipment) {
        throw new Error("Equipment not found");
      }
      if (isNaN(quantity) || quantity <= 0) {
        throw new Error("Invalid equipment quantity");
      }
      if (getAvailableEquipmentQuantity_(equipmentId) < quantity) {
        throw new Error("Not enough available equipment to issue");
      }

      appendRow_(SHEETS.EQUIPMENT_LEDGER, {
        ID: generateId_(),
        EquipmentID: equipmentId,
        EquipmentName: equipment.name,
        Quantity: quantity,
        IssuedTo: payload.issuedTo,
        Department: payload.department,
        IssueDate: todayIso_(),
        ExpectedReturnDate: payload.expectedReturnDate || "",
        ReturnDate: "",
        Status: "issued",
      });
      return jsonResponse_({ success: true });
    }

    if (action === "createEquipmentType") {
      const equipmentId = generateId_();
      const equipmentName = String(payload.name || "").trim();
      const totalQuantity = Number(payload.totalQuantity);

      if (!equipmentName) {
        throw new Error("Missing equipment name");
      }
      if (isNaN(totalQuantity) || totalQuantity < 0) {
        throw new Error("Invalid total quantity");
      }
      if (equipmentTypeExists_(equipmentName)) {
        throw new Error("Equipment item already exists");
      }

      appendRow_(SHEETS.EQUIPMENT_CATALOG, {
        ID: equipmentId,
        Name: equipmentName,
        TotalQuantity: totalQuantity,
      });

      return jsonResponse_({
        success: true,
        data: { equipmentId: equipmentId },
      });
    }

    if (action === "setEquipmentStock") {
      const equipmentId = String(payload.equipmentId || "").trim();
      const targetQuantity = Number(payload.quantity);
      const equipment = getEquipmentTypeById_(equipmentId);

      if (!equipmentId) {
        throw new Error("Missing equipment ID");
      }
      if (!equipment) {
        throw new Error("Equipment not found");
      }
      if (isNaN(targetQuantity) || targetQuantity < 0) {
        throw new Error("Invalid total quantity");
      }

      const issuedQuantity = getIssuedEquipmentQuantity_(equipmentId);
      if (targetQuantity < issuedQuantity) {
        throw new Error("Total quantity cannot be lower than currently issued quantity");
      }

      updateRow_(SHEETS.EQUIPMENT_CATALOG, "ID", equipmentId, {
        TotalQuantity: targetQuantity,
      });
      return jsonResponse_({ success: true });
    }

    if (action === "returnEquipment") {
      updateRow_(SHEETS.EQUIPMENT_LEDGER, "ID", payload.ledgerId, {
        Status: "returned",
        ReturnDate: todayIso_(),
      });
      return jsonResponse_({ success: true });
    }

    if (action === "addFoodShipment") {
      appendRow_(SHEETS.FOOD_TRANSACTIONS, {
        ID: generateId_(),
        Date: todayIso_(),
        Type: "in",
        ProductID: payload.productId,
        ProductName: getFoodProductName_(payload.productId),
        Quantity: Number(payload.quantity || 0),
        DestinationApartmentId: "",
        DestinationName: "",
      });
      return jsonResponse_({ success: true });
    }

    if (action === "createFoodProduct") {
      const productId = generateId_();
      const productName = String(payload.name || "").trim();
      const category = String(payload.category || "").trim();
      const department =
        getDepartmentNameById_(payload.departmentId) ||
        String(payload.department || "").trim();
      const initialQuantity = Number(payload.initialQuantity || 0);

      if (!productName || !category) {
        throw new Error("Missing product name or category");
      }
      if (isNaN(initialQuantity) || initialQuantity < 0) {
        throw new Error("Invalid initial quantity");
      }
      if (foodProductExists_(productName)) {
        throw new Error("Food product already exists");
      }

      appendRow_(SHEETS.FOOD_CATALOG, {
        ID: productId,
        Name: productName,
        Category: category,
        Department: department,
      });

      if (initialQuantity > 0) {
        appendFoodTransaction_(productId, "in", initialQuantity, {
          productName: productName,
        });
      }

      return jsonResponse_({
        success: true,
        data: { productId: productId },
      });
    }

    if (action === "deleteFoodProduct") {
      const productId = String(payload.productId || "").trim();
      if (!productId) {
        throw new Error("Missing product ID");
      }
      if (foodProductHasTransactions_(productId)) {
        throw new Error("Cannot delete product with inventory history");
      }

      deleteRow_(SHEETS.FOOD_CATALOG, "ID", productId);
      return jsonResponse_({ success: true });
    }

    if (action === "setFoodStock") {
      const targetQuantity = Number(payload.quantity);
      const productId = String(payload.productId || "").trim();

      if (!productId) {
        throw new Error("Missing product ID");
      }
      if (isNaN(targetQuantity) || targetQuantity < 0) {
        throw new Error("Invalid target quantity");
      }

      const currentQuantity = getFoodStock_(productId);
      const delta = Number((targetQuantity - currentQuantity).toFixed(2));

      if (delta !== 0) {
        appendFoodTransaction_(
          productId,
          delta > 0 ? "in" : "out",
          Math.abs(delta),
          {}
        );
      }

      return jsonResponse_({ success: true });
    }

    if (action === "supplyApartment") {
      const quantity = Number(payload.quantity || 0);
      const apartment = getApartment_(payload.apartmentId);
      const currentQuantity = getFoodStock_(payload.productId);

      if (isNaN(quantity) || quantity <= 0) {
        throw new Error("Invalid supply quantity");
      }
      if (currentQuantity < quantity) {
        throw new Error("Not enough stock for apartment supply");
      }

      appendFoodTransaction_(payload.productId, "out", quantity, {
        destinationApartmentId: payload.apartmentId,
        destinationName: apartment ? apartment.name : "",
      });
      updateRow_(SHEETS.APARTMENTS, "ID", payload.apartmentId, {
        LastSupplied: todayIso_(),
      });
      return jsonResponse_({ success: true });
    }

    if (action === "addReserveDuty") {
      updateRow_(SHEETS.EMPLOYEES, "ID", payload.employeeId, {
        Status: "reserve",
        ReserveStartDate: payload.startDate,
        ReserveEndDate: payload.endDate,
      });
      return jsonResponse_({ success: true });
    }

    if (action === "endReserveDuty") {
      updateRow_(SHEETS.EMPLOYEES, "ID", payload.employeeId, {
        Status: "active",
        ReserveStartDate: "",
        ReserveEndDate: "",
      });
      return jsonResponse_({ success: true });
    }

    if (action === "assignQualification") {
      appendRow_(SHEETS.EMPLOYEE_QUALIFICATIONS, {
        EmployeeID: payload.employeeId,
        QualificationID: payload.qualificationId,
      });
      return jsonResponse_({ success: true });
    }

    if (action === "removeQualification") {
      deleteRow_(
        SHEETS.EMPLOYEE_QUALIFICATIONS,
        "EmployeeID",
        payload.employeeId,
        function (row) {
          return stringValue_(row.QualificationID) === String(payload.qualificationId);
        }
      );
      return jsonResponse_({ success: true });
    }

    return jsonResponse_({ success: false, error: "Unknown action: " + action });
  } catch (err) {
    return jsonResponse_({ success: false, error: String(err) });
  }
}

function createDepartment_(payload) {
  const departmentId = generateId_();
  const departmentName = String(payload.name || "").trim();

  if (!departmentName) {
    throw new Error("Missing department name");
  }
  if (departmentExists_(departmentName)) {
    throw new Error("Department already exists");
  }

  appendRow_(SHEETS.DEPARTMENTS, {
    ID: departmentId,
    Name: departmentName,
  });

  return jsonResponse_({
    success: true,
    data: { departmentId: departmentId },
  });
}

function deleteDepartment_(payload) {
  const department = getDepartmentById_(payload.departmentId);
  if (!department) {
    throw new Error("Department not found");
  }

  const dependencyError = getDepartmentDeleteError_(department.name);
  if (dependencyError) {
    throw new Error(dependencyError);
  }

  deleteRow_(SHEETS.DEPARTMENTS, "ID", payload.departmentId);
  return jsonResponse_({ success: true });
}

function createQualification_(payload) {
  const qualificationId = generateId_();
  const qualificationName = String(payload.name || "").trim();

  if (!qualificationName) {
    throw new Error("Missing qualification name");
  }
  if (qualificationExists_(qualificationName)) {
    throw new Error("Qualification already exists");
  }

  appendRow_(SHEETS.QUALIFICATIONS, {
    ID: qualificationId,
    Name: qualificationName,
  });

  return jsonResponse_({
    success: true,
    data: { qualificationId: qualificationId },
  });
}

function deleteQualification_(payload) {
  deleteRow_(SHEETS.EMPLOYEE_QUALIFICATIONS, "QualificationID", payload.qualificationId);
  deleteRow_(SHEETS.QUALIFICATIONS, "ID", payload.qualificationId);
  return jsonResponse_({ success: true });
}

function createDrivingLicense_(payload) {
  const licenseId = generateId_();
  const licenseName = String(payload.name || "").trim();

  if (!licenseName) {
    throw new Error("Missing driving license name");
  }
  if (drivingLicenseExists_(licenseName)) {
    throw new Error("Driving license already exists");
  }

  appendRow_(SHEETS.DRIVING_LICENSES, {
    ID: licenseId,
    Name: licenseName,
  });

  return jsonResponse_({
    success: true,
    data: { licenseId: licenseId },
  });
}

function deleteDrivingLicense_(payload) {
  const license = getDrivingLicenseById_(payload.licenseId);
  if (!license) {
    throw new Error("Driving license not found");
  }

  if (drivingLicenseUsedByVehicles_(license.name)) {
    throw new Error("Cannot delete driving license used by vehicles");
  }
  if (drivingLicenseUsedByVehicleTasks_(license.name)) {
    throw new Error("Cannot delete driving license used by vehicle history");
  }

  deleteRow_(SHEETS.DRIVING_LICENSES, "ID", payload.licenseId);
  return jsonResponse_({ success: true });
}

function createVehicle_(payload) {
  const plate = String(payload.plate || "").trim();
  const vehicleType = String(payload.vehicleType || "").trim();

  if (!plate) {
    throw new Error("Missing vehicle plate");
  }
  if (vehicleExists_(plate)) {
    throw new Error("Vehicle already exists");
  }
  if (vehicleType && !drivingLicenseExists_(vehicleType)) {
    throw new Error("Driving license not found");
  }

  appendRow_(SHEETS.VEHICLES, {
    Plate: plate,
    VehicleType: vehicleType,
    Status: "available",
    CurrentDriver: "",
    DepartureLocation: "",
    TaskPurpose: "",
    MissionType: "",
    RequesterName: "",
    RequestingDepartment: "",
    DepartureTime: "",
    Notes: payload.notes || "",
  });

  return jsonResponse_({
    success: true,
    data: { plate: plate },
  });
}

function createCampTask_(payload) {
  const taskId = generateId_();
  const requesterName = String(payload.requesterName || "").trim();
  const mission = String(payload.mission || "").trim();
  const treatmentSummary = String(payload.treatmentSummary || "").trim();
  const date = String(payload.date || "").trim() || todayIso_();

  if (!requesterName) {
    throw new Error("Missing requester name");
  }
  if (!mission) {
    throw new Error("Missing mission");
  }
  if (!treatmentSummary) {
    throw new Error("Missing treatment summary");
  }

  appendRow_(SHEETS.CAMP_TASKS, {
    ID: taskId,
    Date: date,
    Department: payload.department || "",
    RequesterName: requesterName,
    Mission: mission,
    TreatmentSummary: treatmentSummary,
  });

  return jsonResponse_({
    success: true,
    data: { taskId: taskId },
  });
}

function deleteVehicle_(payload) {
  const vehicle = getVehicleByPlate_(payload.plate);
  if (!vehicle) {
    throw new Error("Vehicle not found");
  }
  if (String(vehicle.Status) === "in_use") {
    throw new Error("Cannot delete a vehicle that is currently in use");
  }
  if (vehicleHasOpenTrip_(payload.plate)) {
    throw new Error("Cannot delete a vehicle with an open trip");
  }

  deleteRow_(SHEETS.VEHICLES, "Plate", payload.plate);
  return jsonResponse_({ success: true });
}

function createEmployee_(payload) {
  const employeeId = generateId_();
  const employeeName = String(payload.name || "").trim();
  const department = getDepartmentById_(payload.departmentId);

  if (!employeeName) {
    throw new Error("Missing employee name");
  }
  if (!department) {
    throw new Error("Department not found");
  }
  if (employeeExists_(employeeName)) {
    throw new Error("Employee already exists");
  }

  appendRow_(SHEETS.EMPLOYEES, {
    ID: employeeId,
    Name: employeeName,
    Department: department.name,
    Status: "active",
    ReserveStartDate: "",
    ReserveEndDate: "",
    Phone: payload.phone || "",
    Role: payload.role || "",
  });

  return jsonResponse_({
    success: true,
    data: { employeeId: employeeId },
  });
}

function deleteEmployee_(payload) {
  const employee = getEmployeeById_(payload.employeeId);
  if (!employee) {
    throw new Error("Employee not found");
  }
  if (employeeHasActiveEquipmentLoans_(employee.name)) {
    throw new Error("Cannot delete employee with active equipment loans");
  }
  if (employeeDrivesActiveVehicle_(employee.name)) {
    throw new Error("Cannot delete employee assigned to an active vehicle");
  }

  deleteRow_(SHEETS.EMPLOYEE_QUALIFICATIONS, "EmployeeID", payload.employeeId);
  deleteRow_(SHEETS.EMPLOYEES, "ID", payload.employeeId);
  return jsonResponse_({ success: true });
}

function buildInitialData_() {
  const departmentsRows = getRows_(SHEETS.DEPARTMENTS);
  const drivingLicenseRows = getRows_(SHEETS.DRIVING_LICENSES);
  const employeesRows = getRows_(SHEETS.EMPLOYEES);
  const vehiclesRows = getRows_(SHEETS.VEHICLES);
  const vehicleTaskRows = getRows_(SHEETS.VEHICLE_TRIPS);
  const campTaskRows = getRows_(SHEETS.CAMP_TASKS);
  const equipmentTypeRows = getRows_(SHEETS.EQUIPMENT_CATALOG);
  const equipmentLedgerRows = getRows_(SHEETS.EQUIPMENT_LEDGER);
  const foodProductRows = getRows_(SHEETS.FOOD_CATALOG);
  const foodTransactionRows = getRows_(SHEETS.FOOD_TRANSACTIONS);
  const apartmentsRows = getRows_(SHEETS.APARTMENTS);
  const qualificationRows = getRows_(SHEETS.QUALIFICATIONS);
  const employeeQualificationRows = getRows_(SHEETS.EMPLOYEE_QUALIFICATIONS);

  const equipmentNameById = indexByField_(equipmentTypeRows, "ID", "Name");
  const productNameById = indexByField_(foodProductRows, "ID", "Name");
  const apartmentNameById = indexByField_(apartmentsRows, "ID", "Name");

  return {
    departments: departmentsRows.map(normalizeDepartment_),
    drivingLicenses: drivingLicenseRows.map(normalizeDrivingLicense_),
    employees: employeesRows.map(normalizeEmployee_),
    vehicles: vehiclesRows.map(normalizeVehicle_),
    vehicleTasks: vehicleTaskRows.map(normalizeVehicleTask_),
    campTasks: campTaskRows.map(normalizeCampTask_),
    equipmentTypes: equipmentTypeRows.map(normalizeEquipmentType_),
    equipmentLedger: equipmentLedgerRows.map(function (row) {
      return normalizeEquipmentLedger_(row, equipmentNameById);
    }),
    foodProducts: foodProductRows.map(normalizeFoodProduct_),
    foodTransactions: foodTransactionRows.map(function (row) {
      return normalizeFoodTransaction_(row, productNameById, apartmentNameById);
    }),
    apartments: apartmentsRows.map(normalizeApartment_),
    qualifications: qualificationRows.map(normalizeQualification_),
    employeeQualifications: employeeQualificationRows.map(normalizeEmployeeQualification_),
  };
}

function normalizeDepartment_(row) {
  return {
    id: stringValue_(row.ID),
    name: stringValue_(row.Name),
  };
}

function normalizeDrivingLicense_(row) {
  return {
    id: stringValue_(row.ID),
    name: stringValue_(row.Name),
  };
}

function normalizeEmployee_(row) {
  return {
    id: stringValue_(row.ID),
    name: stringValue_(row.Name),
    department: stringValue_(row.Department),
    status: stringValue_(row.Status) || "active",
    reserveStartDate: optionalString_(row.ReserveStartDate),
    reserveEndDate: optionalString_(row.ReserveEndDate),
    phone: optionalString_(row.Phone),
    role: optionalString_(row.Role),
  };
}

function normalizeVehicle_(row) {
  return {
    plate: stringValue_(row.Plate),
    vehicleType: optionalString_(row.VehicleType),
    status: stringValue_(row.Status) || "available",
    currentDriver: optionalString_(row.CurrentDriver),
    departureLocation: optionalString_(row.DepartureLocation) || optionalString_(row.Origin),
    taskPurpose: optionalString_(row.TaskPurpose) || optionalString_(row.Destination),
    missionType: normalizeMissionType_(row.MissionType),
    requesterName: optionalString_(row.RequesterName),
    requestingDepartment: optionalString_(row.RequestingDepartment),
    departureTime: optionalString_(row.DepartureTime),
    notes: optionalString_(row.Notes),
  };
}

function normalizeVehicleTask_(row) {
  return {
    id: stringValue_(row.ID),
    plate: stringValue_(row.Plate),
    vehicleType: optionalString_(row.VehicleType),
    driver: stringValue_(row.Driver),
    departureLocation:
      stringValue_(row.DepartureLocation) ||
      stringValue_(row.Location) ||
      stringValue_(row.Destination) ||
      stringValue_(row.Origin),
    taskPurpose:
      stringValue_(row.TaskPurpose) ||
      stringValue_(row.Mission) ||
      stringValue_(row.Destination),
    missionType: normalizeMissionType_(row.MissionType),
    requesterName: optionalString_(row.RequesterName),
    requestingDepartment: optionalString_(row.RequestingDepartment) || optionalString_(row.Department),
    departureTime: stringValue_(row.DepartureTime),
    returnTime: optionalString_(row.ReturnTime),
    workHours: optionalNumber_(row.WorkHours),
    treatmentSummary: optionalString_(row.TreatmentSummary),
  };
}

function normalizeCampTask_(row) {
  return {
    id: stringValue_(row.ID),
    date: stringValue_(row.Date),
    department: optionalString_(row.Department),
    requesterName: stringValue_(row.RequesterName),
    mission: stringValue_(row.Mission),
    treatmentSummary: stringValue_(row.TreatmentSummary),
  };
}

function normalizeEquipmentType_(row) {
  return {
    id: stringValue_(row.ID),
    name: stringValue_(row.Name),
    totalQuantity: numberValue_(row.TotalQuantity),
  };
}

function normalizeEquipmentLedger_(row, equipmentNameById) {
  const equipmentId = stringValue_(row.EquipmentID);

  return {
    id: stringValue_(row.ID),
    equipmentId: equipmentId,
    equipmentName: stringValue_(row.EquipmentName) || equipmentNameById[equipmentId] || equipmentId,
    quantity: numberValue_(row.Quantity),
    issuedTo: stringValue_(row.IssuedTo),
    department: stringValue_(row.Department),
    issueDate: stringValue_(row.IssueDate),
    expectedReturnDate: optionalString_(row.ExpectedReturnDate),
    returnDate: optionalString_(row.ReturnDate),
    status: stringValue_(row.Status) || "issued",
  };
}

function normalizeFoodProduct_(row) {
  return {
    id: stringValue_(row.ID),
    name: stringValue_(row.Name),
    category: stringValue_(row.Category),
    department: optionalString_(row.Department),
  };
}

function normalizeFoodTransaction_(row, productNameById, apartmentNameById) {
  const productId = stringValue_(row.ProductID);
  const destinationApartmentId = optionalString_(row.DestinationApartmentId);

  return {
    id: stringValue_(row.ID),
    date: stringValue_(row.Date),
    type: stringValue_(row.Type) === "out" ? "out" : "in",
    productId: productId,
    productName: stringValue_(row.ProductName) || productNameById[productId] || productId,
    quantity: numberValue_(row.Quantity),
    destinationApartmentId: destinationApartmentId,
    destination:
      optionalString_(row.DestinationName) ||
      optionalString_(row.Destination) ||
      (destinationApartmentId ? apartmentNameById[destinationApartmentId] : ""),
  };
}

function normalizeApartment_(row) {
  return {
    id: stringValue_(row.ID),
    name: stringValue_(row.Name),
    lastSupplied: optionalString_(row.LastSupplied),
  };
}

function normalizeQualification_(row) {
  return {
    id: stringValue_(row.ID),
    name: stringValue_(row.Name),
  };
}

function normalizeEmployeeQualification_(row) {
  return {
    employeeId: stringValue_(row.EmployeeID),
    qualificationId: stringValue_(row.QualificationID),
  };
}

function getRows_(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];

  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const headers = values[0];
  return values.slice(1).map(function (row) {
    const item = {};
    headers.forEach(function (header, index) {
      item[header] = row[index];
    });
    return item;
  });
}

function appendRow_(sheetName, record) {
  const sheet = getSheet_(sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(function (header) {
    return record[header] !== undefined ? record[header] : "";
  });
  sheet.appendRow(row);
}

function updateRow_(sheetName, keyColumn, keyValue, updates) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length === 0) return false;

  const headers = values[0];
  const keyIndex = headers.indexOf(keyColumn);
  if (keyIndex === -1) {
    throw new Error("Column not found: " + keyColumn + " in " + sheetName);
  }

  for (var rowIndex = 1; rowIndex < values.length; rowIndex++) {
    if (String(values[rowIndex][keyIndex]) === String(keyValue)) {
      Object.keys(updates).forEach(function (columnName) {
        const columnIndex = headers.indexOf(columnName);
        if (columnIndex !== -1) {
          sheet.getRange(rowIndex + 1, columnIndex + 1).setValue(updates[columnName]);
        }
      });
      return true;
    }
  }

  return false;
}

function deleteRow_(sheetName, keyColumn, keyValue, extraFilter) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length === 0) return;

  const headers = values[0];
  const keyIndex = headers.indexOf(keyColumn);

  for (var rowIndex = values.length - 1; rowIndex >= 1; rowIndex--) {
    if (String(values[rowIndex][keyIndex]) === String(keyValue)) {
      const rowObject = {};
      headers.forEach(function (header, index) {
        rowObject[header] = values[rowIndex][index];
      });
      if (!extraFilter || extraFilter(rowObject)) {
        sheet.deleteRow(rowIndex + 1);
      }
    }
  }
}

function closeLatestVehicleTrip_(plate, payload) {
  const sheet = getSheet_(SHEETS.VEHICLE_TRIPS);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return;

  const headers = values[0];
  const plateIndex = headers.indexOf("Plate");
  const departureTimeIndex = headers.indexOf("DepartureTime");
  const returnTimeIndex = headers.indexOf("ReturnTime");
  const workHoursIndex = headers.indexOf("WorkHours");
  const treatmentSummaryIndex = headers.indexOf("TreatmentSummary");

  if (plateIndex === -1 || returnTimeIndex === -1) return;

  for (var rowIndex = values.length - 1; rowIndex >= 1; rowIndex--) {
    if (
      String(values[rowIndex][plateIndex]) === String(plate) &&
      !String(values[rowIndex][returnTimeIndex] || "").trim()
    ) {
      var returnTime = payload.returnTime || new Date().toISOString();
      sheet.getRange(rowIndex + 1, returnTimeIndex + 1).setValue(returnTime);
      if (workHoursIndex !== -1) {
        var calculatedWorkHours = payload.workHours;
        if (calculatedWorkHours === undefined || calculatedWorkHours === null || calculatedWorkHours === "") {
          calculatedWorkHours = computeHoursBetween_(
            departureTimeIndex !== -1 ? values[rowIndex][departureTimeIndex] : "",
            returnTime
          );
        }
        if (calculatedWorkHours !== "") {
          sheet.getRange(rowIndex + 1, workHoursIndex + 1).setValue(Number(calculatedWorkHours));
        }
      }
      if (treatmentSummaryIndex !== -1) {
        sheet.getRange(rowIndex + 1, treatmentSummaryIndex + 1).setValue(payload.treatmentSummary || "");
      }
      return;
    }
  }
}

function getEquipmentName_(equipmentId) {
  return findValueById_(SHEETS.EQUIPMENT_CATALOG, equipmentId, "Name") || String(equipmentId);
}

function getEquipmentTypeById_(equipmentId) {
  const rows = getRows_(SHEETS.EQUIPMENT_CATALOG);
  for (var index = 0; index < rows.length; index++) {
    if (String(rows[index].ID) === String(equipmentId)) {
      return {
        id: String(rows[index].ID),
        name: String(rows[index].Name),
        totalQuantity: numberValue_(rows[index].TotalQuantity),
      };
    }
  }
  return null;
}

function getDepartmentNameById_(departmentId) {
  const department = getDepartmentById_(departmentId);
  return department ? department.name : "";
}

function getDepartmentById_(departmentId) {
  const rows = getRows_(SHEETS.DEPARTMENTS);
  for (var index = 0; index < rows.length; index++) {
    if (String(rows[index].ID) === String(departmentId)) {
      return {
        id: String(rows[index].ID),
        name: String(rows[index].Name),
      };
    }
  }
  return null;
}

function getDrivingLicenseById_(licenseId) {
  const rows = getRows_(SHEETS.DRIVING_LICENSES);
  for (var index = 0; index < rows.length; index++) {
    if (String(rows[index].ID) === String(licenseId)) {
      return {
        id: String(rows[index].ID),
        name: String(rows[index].Name),
      };
    }
  }
  return null;
}

function getEmployeeById_(employeeId) {
  const rows = getRows_(SHEETS.EMPLOYEES);
  for (var index = 0; index < rows.length; index++) {
    if (String(rows[index].ID) === String(employeeId)) {
      return {
        id: String(rows[index].ID),
        name: String(rows[index].Name),
      };
    }
  }
  return null;
}

function getVehicleByPlate_(plate) {
  const rows = getRows_(SHEETS.VEHICLES);
  for (var index = 0; index < rows.length; index++) {
    if (String(rows[index].Plate) === String(plate)) {
      return rows[index];
    }
  }
  return null;
}

function getVehicleType_(plate) {
  const vehicle = getVehicleByPlate_(plate);
  return vehicle ? String(vehicle.VehicleType || "").trim() : "";
}

function departmentExists_(departmentName) {
  return nameExistsInSheet_(SHEETS.DEPARTMENTS, "Name", departmentName);
}

function qualificationExists_(qualificationName) {
  return nameExistsInSheet_(SHEETS.QUALIFICATIONS, "Name", qualificationName);
}

function drivingLicenseExists_(licenseName) {
  return nameExistsInSheet_(SHEETS.DRIVING_LICENSES, "Name", licenseName);
}

function vehicleExists_(plate) {
  const rows = getRows_(SHEETS.VEHICLES);
  for (var index = 0; index < rows.length; index++) {
    if (String(rows[index].Plate || "").trim() === String(plate).trim()) {
      return true;
    }
  }
  return false;
}

function employeeExists_(employeeName) {
  return nameExistsInSheet_(SHEETS.EMPLOYEES, "Name", employeeName);
}

function equipmentTypeExists_(equipmentName) {
  return nameExistsInSheet_(SHEETS.EQUIPMENT_CATALOG, "Name", equipmentName);
}

function getIssuedEquipmentQuantity_(equipmentId) {
  return getRows_(SHEETS.EQUIPMENT_LEDGER).reduce(function (sum, row) {
    if (
      String(row.EquipmentID) !== String(equipmentId) ||
      String(row.Status) === "returned"
    ) {
      return sum;
    }

    return sum + numberValue_(row.Quantity);
  }, 0);
}

function getAvailableEquipmentQuantity_(equipmentId) {
  const equipment = getEquipmentTypeById_(equipmentId);
  if (!equipment) return 0;
  return Math.max(0, equipment.totalQuantity - getIssuedEquipmentQuantity_(equipmentId));
}

function foodProductExists_(productName) {
  return nameExistsInSheet_(SHEETS.FOOD_CATALOG, "Name", productName);
}

function nameExistsInSheet_(sheetName, columnName, name) {
  const normalizedName = String(name || "").trim().toLowerCase();
  const rows = getRows_(sheetName);

  for (var index = 0; index < rows.length; index++) {
    if (String(rows[index][columnName] || "").trim().toLowerCase() === normalizedName) {
      return true;
    }
  }

  return false;
}

function getFoodProductName_(productId) {
  return findValueById_(SHEETS.FOOD_CATALOG, productId, "Name") || String(productId);
}

function getFoodStock_(productId) {
  return getRows_(SHEETS.FOOD_TRANSACTIONS).reduce(function (sum, row) {
    if (String(row.ProductID) !== String(productId)) {
      return sum;
    }

    const quantity = numberValue_(row.Quantity);
    return sum + (String(row.Type) === "out" ? -quantity : quantity);
  }, 0);
}

function getDepartmentDeleteError_(departmentName) {
  const employees = getRows_(SHEETS.EMPLOYEES);
  for (var employeeIndex = 0; employeeIndex < employees.length; employeeIndex++) {
    if (String(employees[employeeIndex].Department) === String(departmentName)) {
      return "Cannot delete department assigned to employees";
    }
  }

  const equipmentLedger = getRows_(SHEETS.EQUIPMENT_LEDGER);
  for (var ledgerIndex = 0; ledgerIndex < equipmentLedger.length; ledgerIndex++) {
    if (
      String(equipmentLedger[ledgerIndex].Department) === String(departmentName) &&
      String(equipmentLedger[ledgerIndex].Status) !== "returned"
    ) {
      return "Cannot delete department used by active equipment issues";
    }
  }

  const foodCatalog = getRows_(SHEETS.FOOD_CATALOG);
  for (var productIndex = 0; productIndex < foodCatalog.length; productIndex++) {
    if (String(foodCatalog[productIndex].Department || "") === String(departmentName)) {
      return "Cannot delete department assigned to products";
    }
  }

  return "";
}

function employeeHasActiveEquipmentLoans_(employeeName) {
  const rows = getRows_(SHEETS.EQUIPMENT_LEDGER);
  for (var index = 0; index < rows.length; index++) {
    if (
      String(rows[index].IssuedTo) === String(employeeName) &&
      String(rows[index].Status) !== "returned"
    ) {
      return true;
    }
  }
  return false;
}

function employeeDrivesActiveVehicle_(employeeName) {
  const rows = getRows_(SHEETS.VEHICLES);
  for (var index = 0; index < rows.length; index++) {
    if (
      String(rows[index].CurrentDriver) === String(employeeName) &&
      String(rows[index].Status) === "in_use"
    ) {
      return true;
    }
  }
  return false;
}

function vehicleHasOpenTrip_(plate) {
  const rows = getRows_(SHEETS.VEHICLE_TRIPS);
  for (var index = rows.length - 1; index >= 0; index--) {
    if (
      String(rows[index].Plate) === String(plate) &&
      !String(rows[index].ReturnTime || "").trim()
    ) {
      return true;
    }
  }
  return false;
}

function foodProductHasTransactions_(productId) {
  const rows = getRows_(SHEETS.FOOD_TRANSACTIONS);
  for (var index = 0; index < rows.length; index++) {
    if (String(rows[index].ProductID) === String(productId)) {
      return true;
    }
  }
  return false;
}

function drivingLicenseUsedByVehicles_(licenseName) {
  const rows = getRows_(SHEETS.VEHICLES);
  for (var index = 0; index < rows.length; index++) {
    if (String(rows[index].VehicleType || "").trim() === String(licenseName).trim()) {
      return true;
    }
  }
  return false;
}

function drivingLicenseUsedByVehicleTasks_(licenseName) {
  const rows = getRows_(SHEETS.VEHICLE_TRIPS);
  for (var index = 0; index < rows.length; index++) {
    if (String(rows[index].VehicleType || "").trim() === String(licenseName).trim()) {
      return true;
    }
  }
  return false;
}

function computeHoursBetween_(startValue, endValue) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return "";
  const diff = (end.getTime() - start.getTime()) / 3600000;
  if (diff < 0) return "";
  return Number(diff.toFixed(2));
}

function normalizeMissionType_(value) {
  return value === "supply" || value === "fault" || value === "other"
    ? value
    : "other";
}

function appendFoodTransaction_(productId, type, quantity, options) {
  const metadata = options || {};

  appendRow_(SHEETS.FOOD_TRANSACTIONS, {
    ID: generateId_(),
    Date: todayIso_(),
    Type: type,
    ProductID: productId,
    ProductName: metadata.productName || getFoodProductName_(productId),
    Quantity: quantity,
    DestinationApartmentId: metadata.destinationApartmentId || "",
    DestinationName: metadata.destinationName || "",
  });
}

function getApartment_(apartmentId) {
  const rows = getRows_(SHEETS.APARTMENTS);
  for (var index = 0; index < rows.length; index++) {
    if (String(rows[index].ID) === String(apartmentId)) {
      return {
        id: String(rows[index].ID),
        name: String(rows[index].Name),
      };
    }
  }
  return null;
}

function findValueById_(sheetName, id, columnName) {
  const rows = getRows_(sheetName);
  for (var index = 0; index < rows.length; index++) {
    if (String(rows[index].ID) === String(id)) {
      return rows[index][columnName];
    }
  }
  return "";
}

function indexByField_(rows, keyField, valueField) {
  const output = {};
  rows.forEach(function (row) {
    const key = String(row[keyField] || "");
    if (key) {
      output[key] = String(row[valueField] || "");
    }
  });
  return output;
}

function stringValue_(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function optionalString_(value) {
  const result = stringValue_(value);
  return result ? result : undefined;
}

function optionalNumber_(value) {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return isNaN(parsed) ? undefined : parsed;
}

function numberValue_(value) {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return isNaN(parsed) ? 0 : parsed;
}

function todayIso_() {
  return new Date().toISOString().split("T")[0];
}

function generateId_() {
  return Utilities.getUuid();
}

function getSheet_(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  return sheet;
}

function jsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}
