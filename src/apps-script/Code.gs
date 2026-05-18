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
 * Camp_Tasks: ID, Date, Department, RequesterName, ApprovingCommander, Mission, TreatmentSummary
 * Equipment_Catalog: ID, Name, TotalQuantity
 * Equipment_Ledger: ID, EquipmentID, EquipmentName, Quantity, IssuedTo, EmployeeID, Department, IssueDate, ExpectedReturnDate, ReturnDate, Status
 * Food_Catalog: ID, Name, Category, Department
 * Food_Transactions: ID, Date, Type, ProductID, ProductName, Quantity, DestinationApartmentId, DestinationName
 * Apartments: ID, Name, LastSupplied
 * Qualifications: ID, Name
 * Employee_Qualifications: EmployeeID, QualificationID
 * Employee_Driving_Licenses: EmployeeID, DrivingLicenseID
 * SupplyApartments: apartment_id, location, mission, type, notes, report_token, active, created_at, updated_at
 * SupplyStandardItems: standard_item_id, apartment_id, category, item_name, required_value, required_type, photo_required, active, notes
 * SupplyReports: report_id, apartment_id, reporter_initials, reported_at, general_notes, overall_status
 * SupplyReportItems: report_item_id, report_id, standard_item_id, item_name, required_value, reported_status, actual_value, item_notes
 * SupplyReportPhotos: photo_id, report_id, apartment_id, category, drive_file_id, drive_url, uploaded_at, notes
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
  EMPLOYEE_DRIVING_LICENSES: "Employee_Driving_Licenses",
};

const SUPPLY_SHEETS = {
  APARTMENTS: "SupplyApartments",
  STANDARD_ITEMS: "SupplyStandardItems",
  REPORTS: "SupplyReports",
  REPORT_ITEMS: "SupplyReportItems",
  REPORT_PHOTOS: "SupplyReportPhotos",
};

const SUPPLY_CONFIG = {
  SPREADSHEET_ID_PROPERTY: "SUPPLY_SPREADSHEET_ID",
  REPORTS_FOLDER_ID_PROPERTY: "SUPPLY_REPORTS_FOLDER_ID",
  DEFAULT_SPREADSHEET_ID: "1PvcdwxC8ompqPWl2FJU7vahIviLhvJ2c3eVvSC6vzhE",
  DEFAULT_REPORTS_FOLDER_ID: "1L8mJu-SfVdYMibVoLZNgXq-vTslppNYc",
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
    if (action === "updateVehicle") {
      return updateVehicle_(payload);
    }
    if (action === "createCampTask") {
      return createCampTask_(payload);
    }
    if (action === "updateCampTask") {
      return updateCampTask_(payload);
    }
    if (action === "deleteCampTask") {
      return deleteCampTask_(payload);
    }
    if (action === "deleteVehicle") {
      return deleteVehicle_(payload);
    }
    if (action === "createEmployee") {
      return createEmployee_(payload);
    }
    if (action === "updateEmployee") {
      return updateEmployee_(payload);
    }
    if (action === "deleteEmployee") {
      return deleteEmployee_(payload);
    }
    if (action === "supply_get_apartments") {
      return getSupplyApartmentsAction_(payload);
    }
    if (action === "supply_get_apartment") {
      return getSupplyApartmentAction_(payload);
    }
    if (action === "supply_get_standard_items") {
      return getSupplyStandardItemsAction_(payload);
    }
    if (action === "supply_get_reports_by_apartment") {
      return getSupplyReportsByApartmentAction_(payload);
    }
    if (action === "supply_get_report_details") {
      return getSupplyReportDetailsAction_(payload);
    }
    if (action === "supply_create_apartment") {
      return createSupplyApartmentAction_(payload);
    }
    if (action === "supply_update_apartment") {
      return updateSupplyApartmentAction_(payload);
    }
    if (action === "supply_deactivate_apartment") {
      return deactivateSupplyApartmentAction_(payload);
    }
    if (action === "supply_create_standard_item") {
      return createSupplyStandardItemAction_(payload);
    }
    if (action === "supply_update_standard_item") {
      return updateSupplyStandardItemAction_(payload);
    }
    if (action === "supply_deactivate_standard_item") {
      return deactivateSupplyStandardItemAction_(payload);
    }
    if (action === "supply_seed_demo_data") {
      return seedSupplyDemoDataAction_();
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
      const employee = resolveEquipmentEmployee_(payload);
      const requestedEmployeeId = String(payload.employeeId || "").trim();

      if (!equipmentId) {
        throw new Error("Missing equipment ID");
      }
      if (!equipment) {
        throw new Error("Equipment not found");
      }
      if (requestedEmployeeId && !employee) {
        throw new Error("Employee not found");
      }
      if (isNaN(quantity) || quantity <= 0) {
        throw new Error("Invalid equipment quantity");
      }
      if (getAvailableEquipmentQuantity_(equipmentId) < quantity) {
        throw new Error("Not enough available equipment to issue");
      }

      appendIssuedEquipmentRow_({
        equipmentId: equipmentId,
        equipmentName: equipment.name,
        quantity: quantity,
        issuedTo: employee ? employee.name : payload.issuedTo,
        employeeId: employee ? employee.id : "",
        department: payload.department || (employee ? employee.department : ""),
        expectedReturnDate: payload.expectedReturnDate || "",
      });
      return jsonResponse_({ success: true });
    }

    if (action === "syncEmployeeEquipmentAssignments") {
      return syncEmployeeEquipmentAssignments_(payload);
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

  deleteRow_(SHEETS.EMPLOYEE_DRIVING_LICENSES, "DrivingLicenseID", payload.licenseId);
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

function updateVehicle_(payload) {
  const originalPlate = String(payload.originalPlate || "").trim();
  const plate = String(payload.plate || "").trim();
  const vehicleType = String(payload.vehicleType || "").trim();
  const notes = String(payload.notes || "").trim();

  if (!originalPlate) {
    throw new Error("Vehicle not found");
  }
  if (!plate) {
    throw new Error("Missing vehicle plate");
  }
  if (!getVehicleByPlate_(originalPlate)) {
    throw new Error("Vehicle not found");
  }
  if (vehicleType && !drivingLicenseExists_(vehicleType)) {
    throw new Error("Driving license not found");
  }
  if (vehicleExistsOtherThan_(plate, originalPlate)) {
    throw new Error("Vehicle already exists");
  }

  updateRow_(SHEETS.VEHICLES, "Plate", originalPlate, {
    Plate: plate,
    VehicleType: vehicleType,
    Notes: notes,
  });

  if (originalPlate !== plate) {
    updateRowsByField_(SHEETS.VEHICLE_TRIPS, "Plate", originalPlate, {
      Plate: plate,
    });
  }

  return jsonResponse_({
    success: true,
    data: { plate: plate },
  });
}

function createCampTask_(payload) {
  const taskId = generateId_();
  const requesterName = String(payload.requesterName || "").trim();
  const approvingCommander = String(payload.approvingCommander || "").trim();
  const mission = String(payload.mission || "").trim();
  const treatmentSummary = String(payload.treatmentSummary || "").trim();
  const date = String(payload.date || "").trim() || todayIso_();

  if (!requesterName) {
    throw new Error("Missing requester name");
  }
  if (!mission) {
    throw new Error("Missing mission");
  }

  appendRow_(SHEETS.CAMP_TASKS, {
    ID: taskId,
    Date: date,
    Department: payload.department || "",
    RequesterName: requesterName,
    ApprovingCommander: approvingCommander,
    Mission: mission,
    TreatmentSummary: treatmentSummary,
  });

  return jsonResponse_({
    success: true,
    data: { taskId: taskId },
  });
}

function updateCampTask_(payload) {
  const taskId = String(payload.taskId || "").trim();
  const requesterName = String(payload.requesterName || "").trim();
  const approvingCommander = String(payload.approvingCommander || "").trim();
  const mission = String(payload.mission || "").trim();
  const treatmentSummary = String(payload.treatmentSummary || "").trim();
  const date = String(payload.date || "").trim() || todayIso_();

  if (!taskId) {
    throw new Error("Missing camp task ID");
  }
  if (!requesterName) {
    throw new Error("Missing requester name");
  }
  if (!mission) {
    throw new Error("Missing mission");
  }
  if (!updateRow_(SHEETS.CAMP_TASKS, "ID", taskId, {
    Date: date,
    Department: payload.department || "",
    RequesterName: requesterName,
    ApprovingCommander: approvingCommander,
    Mission: mission,
    TreatmentSummary: treatmentSummary,
  })) {
    throw new Error("Camp task not found");
  }

  return jsonResponse_({ success: true });
}

function deleteCampTask_(payload) {
  const taskId = String(payload.taskId || "").trim();
  if (!taskId) {
    throw new Error("Missing camp task ID");
  }
  deleteRow_(SHEETS.CAMP_TASKS, "ID", taskId);
  return jsonResponse_({ success: true });
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

  syncEmployeeAssignments_(
    employeeId,
    payload.qualificationIds || [],
    payload.drivingLicenseIds || []
  );

  return jsonResponse_({
    success: true,
    data: { employeeId: employeeId },
  });
}

function updateEmployee_(payload) {
  const employeeId = String(payload.employeeId || "").trim();
  const employee = getEmployeeById_(employeeId);
  const employeeName = String(payload.name || "").trim();
  const department = getDepartmentById_(payload.departmentId);
  const status = normalizeEmployeeStatus_(payload.status);

  if (!employeeId) {
    throw new Error("Missing employee ID");
  }
  if (!employee) {
    throw new Error("Employee not found");
  }
  if (!employeeName) {
    throw new Error("Missing employee name");
  }
  if (!department) {
    throw new Error("Department not found");
  }
  if (employeeExistsOtherThan_(employeeName, employeeId)) {
    throw new Error("Employee already exists");
  }

  updateRow_(SHEETS.EMPLOYEES, "ID", employeeId, {
    Name: employeeName,
    Department: department.name,
    Status: status,
    ReserveStartDate: status === "reserve" ? payload.reserveStartDate || "" : "",
    ReserveEndDate: status === "reserve" ? payload.reserveEndDate || "" : "",
    Phone: payload.phone || "",
    Role: payload.role || "",
  });

  syncActiveEquipmentLoansForEmployee_(
    employeeId,
    employee.name,
    employeeName,
    department.name
  );

  syncEmployeeAssignments_(
    employeeId,
    payload.qualificationIds || [],
    payload.drivingLicenseIds || []
  );

  return jsonResponse_({ success: true });
}

function deleteEmployee_(payload) {
  const employee = getEmployeeById_(payload.employeeId);
  if (!employee) {
    throw new Error("Employee not found");
  }
  if (employeeHasActiveEquipmentLoans_(employee.id, employee.name)) {
    throw new Error("Cannot delete employee with active equipment loans");
  }
  if (employeeDrivesActiveVehicle_(employee.name)) {
    throw new Error("Cannot delete employee assigned to an active vehicle");
  }

  deleteRow_(SHEETS.EMPLOYEE_QUALIFICATIONS, "EmployeeID", payload.employeeId);
  deleteRow_(SHEETS.EMPLOYEE_DRIVING_LICENSES, "EmployeeID", payload.employeeId);
  deleteRow_(SHEETS.EMPLOYEES, "ID", payload.employeeId);
  return jsonResponse_({ success: true });
}

function getSupplyApartmentsAction_() {
  return jsonResponse_({
    success: true,
    data: getSupplyApartmentsData_(),
  });
}

function getSupplyApartmentAction_(payload) {
  const apartmentId = String(payload.apartmentId || "").trim();
  if (!apartmentId) {
    throw new Error("Missing supply apartment ID");
  }

  const apartment = findSupplyApartmentById_(apartmentId);
  if (!apartment) {
    throw new Error("Supply apartment not found");
  }

  return jsonResponse_({
    success: true,
    data: apartment,
  });
}

function getSupplyStandardItemsAction_(payload) {
  const apartmentId = String(payload.apartmentId || "").trim();
  if (!apartmentId) {
    throw new Error("Missing supply apartment ID");
  }
  if (!findSupplyApartmentById_(apartmentId)) {
    throw new Error("Supply apartment not found");
  }

  return jsonResponse_({
    success: true,
    data: getSupplyStandardItemsData_(apartmentId),
  });
}

function getSupplyReportsByApartmentAction_(payload) {
  const apartmentId = String(payload.apartmentId || "").trim();
  if (!apartmentId) {
    throw new Error("Missing supply apartment ID");
  }
  if (!findSupplyApartmentById_(apartmentId)) {
    throw new Error("Supply apartment not found");
  }

  return jsonResponse_({
    success: true,
    data: getSupplyReportsByApartmentData_(apartmentId),
  });
}

function getSupplyReportDetailsAction_(payload) {
  const reportId = String(payload.reportId || "").trim();
  if (!reportId) {
    throw new Error("Missing supply report ID");
  }

  const details = getSupplyReportDetailsData_(reportId);
  if (!details) {
    throw new Error("Supply report not found");
  }

  return jsonResponse_({
    success: true,
    data: details,
  });
}

function createSupplyApartmentAction_(payload) {
  const apartmentRecord = buildSupplyApartmentRecord_(payload);
  appendSupplyRow_(SUPPLY_SHEETS.APARTMENTS, apartmentRecord);

  return jsonResponse_({
    success: true,
    data: normalizeSupplyApartmentRow_(apartmentRecord),
  });
}

function updateSupplyApartmentAction_(payload) {
  const apartmentId = String(payload.apartmentId || payload.apartment_id || "").trim();
  if (!apartmentId) {
    throw new Error("Missing supply apartment ID");
  }

  const existingApartment = findSupplyApartmentRowById_(apartmentId);
  if (!existingApartment) {
    throw new Error("Supply apartment not found");
  }

  const nextRecord = buildSupplyApartmentRecord_(payload, existingApartment);
  updateSupplyRowByField_(
    SUPPLY_SHEETS.APARTMENTS,
    "apartment_id",
    apartmentId,
    nextRecord
  );

  return jsonResponse_({
    success: true,
    data: normalizeSupplyApartmentRow_(nextRecord),
  });
}

function deactivateSupplyApartmentAction_(payload) {
  const apartmentId = String(payload.apartmentId || payload.apartment_id || "").trim();
  if (!apartmentId) {
    throw new Error("Missing supply apartment ID");
  }
  if (!findSupplyApartmentRowById_(apartmentId)) {
    throw new Error("Supply apartment not found");
  }

  updateSupplyRowByField_(SUPPLY_SHEETS.APARTMENTS, "apartment_id", apartmentId, {
    active: false,
    updated_at: nowIsoString_(),
  });

  return jsonResponse_({
    success: true,
    data: {
      apartment_id: apartmentId,
      active: false,
    },
  });
}

function createSupplyStandardItemAction_(payload) {
  const apartmentId = String(payload.apartment_id || payload.apartmentId || "").trim();
  if (!apartmentId) {
    throw new Error("Missing supply apartment ID");
  }
  if (!findSupplyApartmentRowById_(apartmentId)) {
    throw new Error("Supply apartment not found");
  }

  const itemRecord = buildSupplyStandardItemRecord_(payload);
  appendSupplyRow_(SUPPLY_SHEETS.STANDARD_ITEMS, itemRecord);

  return jsonResponse_({
    success: true,
    data: normalizeSupplyStandardItemRow_(itemRecord),
  });
}

function updateSupplyStandardItemAction_(payload) {
  const standardItemId = String(payload.standardItemId || payload.standard_item_id || "").trim();
  if (!standardItemId) {
    throw new Error("Missing supply standard item ID");
  }

  const existingItem = findSupplyStandardItemRowById_(standardItemId);
  if (!existingItem) {
    throw new Error("Supply standard item not found");
  }

  const nextRecord = buildSupplyStandardItemRecord_(payload, existingItem);
  updateSupplyRowByField_(
    SUPPLY_SHEETS.STANDARD_ITEMS,
    "standard_item_id",
    standardItemId,
    nextRecord
  );

  return jsonResponse_({
    success: true,
    data: normalizeSupplyStandardItemRow_(nextRecord),
  });
}

function deactivateSupplyStandardItemAction_(payload) {
  const standardItemId = String(payload.standardItemId || payload.standard_item_id || "").trim();
  if (!standardItemId) {
    throw new Error("Missing supply standard item ID");
  }
  if (!findSupplyStandardItemRowById_(standardItemId)) {
    throw new Error("Supply standard item not found");
  }

  updateSupplyRowByField_(SUPPLY_SHEETS.STANDARD_ITEMS, "standard_item_id", standardItemId, {
    active: false,
  });

  return jsonResponse_({
    success: true,
    data: {
      standard_item_id: standardItemId,
      active: false,
    },
  });
}

function seedSupplyDemoDataAction_() {
  const demoData = getSupplyDemoData_();
  var createdApartments = 0;
  var createdItems = 0;

  demoData.forEach(function (apartmentSeed) {
    const existingApartment = findSupplyApartmentRowById_(apartmentSeed.apartment_id);
    const apartmentRecord = buildSupplyApartmentRecord_(apartmentSeed, existingApartment);

    if (existingApartment) {
      updateSupplyRowByField_(
        SUPPLY_SHEETS.APARTMENTS,
        "apartment_id",
        apartmentSeed.apartment_id,
        apartmentRecord
      );
    } else {
      appendSupplyRow_(SUPPLY_SHEETS.APARTMENTS, apartmentRecord);
      createdApartments += 1;
    }

    apartmentSeed.standard_items.forEach(function (itemSeed) {
      const existingItem = findSupplyStandardItemRowById_(itemSeed.standard_item_id);
      const itemRecord = buildSupplyStandardItemRecord_(itemSeed, existingItem);

      if (existingItem) {
        updateSupplyRowByField_(
          SUPPLY_SHEETS.STANDARD_ITEMS,
          "standard_item_id",
          itemSeed.standard_item_id,
          itemRecord
        );
      } else {
        appendSupplyRow_(SUPPLY_SHEETS.STANDARD_ITEMS, itemRecord);
        createdItems += 1;
      }
    });
  });

  return jsonResponse_({
    success: true,
    data: {
      apartments: createdApartments,
      items: createdItems,
    },
  });
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
  const employeeDrivingLicenseRows = getRows_(SHEETS.EMPLOYEE_DRIVING_LICENSES);

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
    employeeDrivingLicenses: employeeDrivingLicenseRows.map(normalizeEmployeeDrivingLicense_),
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
    date: dateOnlyValue_(row.Date),
    department: optionalString_(row.Department),
    requesterName: stringValue_(row.RequesterName),
    approvingCommander: optionalString_(row.ApprovingCommander),
    mission: stringValue_(row.Mission),
    treatmentSummary: optionalString_(row.TreatmentSummary),
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
    employeeId: optionalString_(row.EmployeeID),
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

function normalizeEmployeeDrivingLicense_(row) {
  return {
    employeeId: stringValue_(row.EmployeeID),
    drivingLicenseId: stringValue_(row.DrivingLicenseID),
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

function updateRowsByField_(sheetName, keyColumn, keyValue, updates) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length === 0) return 0;

  const headers = values[0];
  const keyIndex = headers.indexOf(keyColumn);
  if (keyIndex === -1) {
    throw new Error("Column not found: " + keyColumn + " in " + sheetName);
  }

  var updatedCount = 0;

  for (var rowIndex = 1; rowIndex < values.length; rowIndex++) {
    if (String(values[rowIndex][keyIndex]) !== String(keyValue)) {
      continue;
    }

    Object.keys(updates).forEach(function (columnName) {
      const columnIndex = headers.indexOf(columnName);
      if (columnIndex !== -1) {
        sheet.getRange(rowIndex + 1, columnIndex + 1).setValue(updates[columnName]);
      }
    });
    updatedCount += 1;
  }

  return updatedCount;
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
        department: String(rows[index].Department || ""),
        status: String(rows[index].Status || "active"),
        reserveStartDate: String(rows[index].ReserveStartDate || ""),
        reserveEndDate: String(rows[index].ReserveEndDate || ""),
        phone: String(rows[index].Phone || ""),
        role: String(rows[index].Role || ""),
      };
    }
  }
  return null;
}

function getEmployeeByName_(employeeName) {
  const normalizedName = String(employeeName || "").trim();
  if (!normalizedName) return null;

  const rows = getRows_(SHEETS.EMPLOYEES);
  for (var index = 0; index < rows.length; index++) {
    if (String(rows[index].Name || "").trim() === normalizedName) {
      return {
        id: String(rows[index].ID),
        name: String(rows[index].Name),
        department: String(rows[index].Department || ""),
        status: String(rows[index].Status || "active"),
        reserveStartDate: String(rows[index].ReserveStartDate || ""),
        reserveEndDate: String(rows[index].ReserveEndDate || ""),
        phone: String(rows[index].Phone || ""),
        role: String(rows[index].Role || ""),
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

function vehicleExistsOtherThan_(plate, originalPlate) {
  const normalizedPlate = String(plate || "").trim();
  const normalizedOriginalPlate = String(originalPlate || "").trim();
  const rows = getRows_(SHEETS.VEHICLES);

  for (var index = 0; index < rows.length; index++) {
    const rowPlate = String(rows[index].Plate || "").trim();
    if (rowPlate === normalizedOriginalPlate) {
      continue;
    }
    if (rowPlate === normalizedPlate) {
      return true;
    }
  }

  return false;
}

function employeeExists_(employeeName) {
  return nameExistsInSheet_(SHEETS.EMPLOYEES, "Name", employeeName);
}

function employeeExistsOtherThan_(employeeName, employeeId) {
  const normalizedName = String(employeeName || "").trim().toLowerCase();
  const rows = getRows_(SHEETS.EMPLOYEES);
  for (var index = 0; index < rows.length; index++) {
    if (
      String(rows[index].ID) !== String(employeeId) &&
      String(rows[index].Name || "").trim().toLowerCase() === normalizedName
    ) {
      return true;
    }
  }
  return false;
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

function appendIssuedEquipmentRow_(record) {
  appendRow_(SHEETS.EQUIPMENT_LEDGER, {
    ID: generateId_(),
    EquipmentID: record.equipmentId,
    EquipmentName: record.equipmentName || getEquipmentName_(record.equipmentId),
    Quantity: Number(record.quantity || 0),
    IssuedTo: record.issuedTo || "",
    EmployeeID: record.employeeId || "",
    Department: record.department || "",
    IssueDate: todayIso_(),
    ExpectedReturnDate: record.expectedReturnDate || "",
    ReturnDate: "",
    Status: "issued",
  });
}

function resolveEquipmentEmployee_(payload) {
  const employeeId = String(payload.employeeId || "").trim();
  if (employeeId) {
    return getEmployeeById_(employeeId);
  }
  return getEmployeeByName_(payload.issuedTo);
}

function matchesActiveEquipmentSigner_(row, employeeId, employeeName) {
  const normalizedEmployeeId = String(employeeId || "").trim();
  const normalizedRowEmployeeId = String(row.EmployeeID || "").trim();
  const normalizedEmployeeName = String(employeeName || "").trim();
  const normalizedIssuedTo = String(row.IssuedTo || "").trim();

  if (String(row.Status) === "returned") {
    return false;
  }

  if (normalizedEmployeeId) {
    return normalizedRowEmployeeId === normalizedEmployeeId;
  }

  return !normalizedRowEmployeeId && normalizedIssuedTo === normalizedEmployeeName;
}

function getActiveEquipmentRowsForEmployee_(employeeId, employeeName) {
  const rows = getRows_(SHEETS.EQUIPMENT_LEDGER);

  return rows.filter(function (row) {
    return matchesActiveEquipmentSigner_(row, employeeId, employeeName);
  });
}

function normalizeEquipmentAssignmentTargets_(assignments) {
  const list = Array.isArray(assignments) ? assignments : [];
  const targets = {};

  list.forEach(function (item) {
    const equipmentId = String(item && item.equipmentId || "").trim();
    const targetQuantity = Number(item && item.targetQuantity);

    if (!equipmentId) {
      throw new Error("Missing equipment ID");
    }
    if (isNaN(targetQuantity) || targetQuantity < 0 || Math.floor(targetQuantity) !== targetQuantity) {
      throw new Error("Invalid equipment quantity");
    }

    targets[equipmentId] = targetQuantity;
  });

  return targets;
}

function returnEquipmentQuantity_(ledgerId, quantityToReturn) {
  const quantity = Number(quantityToReturn);
  if (isNaN(quantity) || quantity <= 0) {
    throw new Error("Invalid equipment quantity");
  }

  const sheet = getSheet_(SHEETS.EQUIPMENT_LEDGER);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    throw new Error("Equipment ledger entry not found");
  }

  const headers = values[0];
  const idIndex = headers.indexOf("ID");
  const quantityIndex = headers.indexOf("Quantity");
  const statusIndex = headers.indexOf("Status");
  const returnDateIndex = headers.indexOf("ReturnDate");

  for (var rowIndex = 1; rowIndex < values.length; rowIndex++) {
    if (String(values[rowIndex][idIndex]) !== String(ledgerId)) {
      continue;
    }

    const currentQuantity = numberValue_(values[rowIndex][quantityIndex]);
    const currentStatus = String(values[rowIndex][statusIndex] || "");

    if (currentStatus === "returned") {
      throw new Error("Equipment already returned");
    }
    if (quantity > currentQuantity) {
      throw new Error("Invalid equipment quantity");
    }

    if (quantity === currentQuantity) {
      sheet.getRange(rowIndex + 1, statusIndex + 1).setValue("returned");
      if (returnDateIndex !== -1) {
        sheet.getRange(rowIndex + 1, returnDateIndex + 1).setValue(todayIso_());
      }
      return;
    }

    const rowObject = {};
    headers.forEach(function (header, index) {
      rowObject[header] = values[rowIndex][index];
    });

    sheet.getRange(rowIndex + 1, quantityIndex + 1).setValue(currentQuantity - quantity);

    appendRow_(SHEETS.EQUIPMENT_LEDGER, {
      ID: generateId_(),
      EquipmentID: rowObject.EquipmentID,
      EquipmentName: rowObject.EquipmentName,
      Quantity: quantity,
      IssuedTo: rowObject.IssuedTo,
      EmployeeID: rowObject.EmployeeID || "",
      Department: rowObject.Department,
      IssueDate: rowObject.IssueDate,
      ExpectedReturnDate: rowObject.ExpectedReturnDate || "",
      ReturnDate: todayIso_(),
      Status: "returned",
    });
    return;
  }

  throw new Error("Equipment ledger entry not found");
}

function syncEmployeeEquipmentAssignments_(payload) {
  const issuedTo = String(payload.issuedTo || "").trim();
  const employeeId = String(payload.employeeId || "").trim();
  const employee = employeeId ? getEmployeeById_(employeeId) : null;

  if (!issuedTo) {
    throw new Error("Missing issued-to name");
  }
  if (employeeId && !employee) {
    throw new Error("Employee not found");
  }

  const effectiveName = employee ? employee.name : issuedTo;
  const nextDepartment = String(payload.department || "").trim() || (employee ? employee.department : "");
  const nextExpectedReturnDate = String(payload.expectedReturnDate || "").trim();
  const applyMetadataToExisting = Boolean(payload.applyMetadataToExisting);

  const assignmentTargets = normalizeEquipmentAssignmentTargets_(payload.assignments);
  const activeRows = getActiveEquipmentRowsForEmployee_(employee ? employee.id : "", effectiveName);
  const currentByEquipment = {};

  activeRows.forEach(function (row) {
    const equipmentId = String(row.EquipmentID || "");
    currentByEquipment[equipmentId] = (currentByEquipment[equipmentId] || 0) + numberValue_(row.Quantity);
  });

  Object.keys(assignmentTargets).forEach(function (equipmentId) {
    const equipment = getEquipmentTypeById_(equipmentId);
    if (!equipment) {
      throw new Error("Equipment not found");
    }

    const currentQuantity = currentByEquipment[equipmentId] || 0;
    const maxAllowed = getAvailableEquipmentQuantity_(equipmentId) + currentQuantity;
    if (assignmentTargets[equipmentId] > maxAllowed) {
      throw new Error("Not enough available equipment to issue");
    }
  });

  Object.keys(assignmentTargets).forEach(function (equipmentId) {
    const targetQuantity = assignmentTargets[equipmentId];
    const currentQuantity = currentByEquipment[equipmentId] || 0;
    const delta = targetQuantity - currentQuantity;

    if (delta > 0) {
      appendIssuedEquipmentRow_({
        equipmentId: equipmentId,
        equipmentName: getEquipmentName_(equipmentId),
        quantity: delta,
        issuedTo: effectiveName,
        employeeId: employee ? employee.id : "",
        department: nextDepartment,
        expectedReturnDate: nextExpectedReturnDate,
      });
      return;
    }

    if (delta < 0) {
      var quantityToReturn = Math.abs(delta);
      const rowsToReturn = activeRows
        .filter(function (row) {
          return String(row.EquipmentID || "") === String(equipmentId);
        })
        .sort(function (a, b) {
          return stringValue_(a.IssueDate).localeCompare(stringValue_(b.IssueDate));
        });

      for (var index = 0; index < rowsToReturn.length && quantityToReturn > 0; index++) {
        const rowQuantity = numberValue_(rowsToReturn[index].Quantity);
        const chunk = Math.min(quantityToReturn, rowQuantity);
        returnEquipmentQuantity_(rowsToReturn[index].ID, chunk);
        quantityToReturn -= chunk;
      }

      if (quantityToReturn > 0) {
        throw new Error("Invalid equipment quantity");
      }
    }
  });

  if (applyMetadataToExisting) {
    syncActiveEquipmentLoanMetadataForEmployee_(
      employee ? employee.id : "",
      effectiveName,
      nextDepartment,
      nextExpectedReturnDate
    );
  }

  return jsonResponse_({ success: true });
}

function syncActiveEquipmentLoanMetadataForEmployee_(employeeId, employeeName, nextDepartment, nextExpectedReturnDate) {
  const sheet = getSheet_(SHEETS.EQUIPMENT_LEDGER);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return;

  const headers = values[0];
  const statusIndex = headers.indexOf("Status");
  const issuedToIndex = headers.indexOf("IssuedTo");
  const employeeIdIndex = headers.indexOf("EmployeeID");
  const departmentIndex = headers.indexOf("Department");
  const expectedReturnDateIndex = headers.indexOf("ExpectedReturnDate");

  for (var rowIndex = 1; rowIndex < values.length; rowIndex++) {
    if (!matchesActiveEquipmentSigner_(
      {
        Status: statusIndex === -1 ? "" : values[rowIndex][statusIndex],
        EmployeeID: employeeIdIndex === -1 ? "" : values[rowIndex][employeeIdIndex],
        IssuedTo: issuedToIndex === -1 ? "" : values[rowIndex][issuedToIndex],
      },
      employeeId,
      employeeName
    )) {
      continue;
    }

    if (departmentIndex !== -1) {
      sheet.getRange(rowIndex + 1, departmentIndex + 1).setValue(nextDepartment);
    }
    if (expectedReturnDateIndex !== -1) {
      sheet.getRange(rowIndex + 1, expectedReturnDateIndex + 1).setValue(nextExpectedReturnDate);
    }
  }
}

function syncActiveEquipmentLoansForEmployee_(employeeId, previousName, nextName, nextDepartment) {
  const sheet = getSheet_(SHEETS.EQUIPMENT_LEDGER);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return;

  const headers = values[0];
  const statusIndex = headers.indexOf("Status");
  const issuedToIndex = headers.indexOf("IssuedTo");
  const employeeIdIndex = headers.indexOf("EmployeeID");
  const departmentIndex = headers.indexOf("Department");

  for (var rowIndex = 1; rowIndex < values.length; rowIndex++) {
    if (!matchesActiveEquipmentSigner_(
      {
        Status: statusIndex === -1 ? "" : values[rowIndex][statusIndex],
        EmployeeID: employeeIdIndex === -1 ? "" : values[rowIndex][employeeIdIndex],
        IssuedTo: issuedToIndex === -1 ? "" : values[rowIndex][issuedToIndex],
      },
      employeeId,
      previousName
    )) {
      continue;
    }

    if (issuedToIndex !== -1) {
      sheet.getRange(rowIndex + 1, issuedToIndex + 1).setValue(nextName);
    }
    if (employeeIdIndex !== -1) {
      sheet.getRange(rowIndex + 1, employeeIdIndex + 1).setValue(employeeId);
    }
    if (departmentIndex !== -1) {
      sheet.getRange(rowIndex + 1, departmentIndex + 1).setValue(nextDepartment);
    }
  }
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

function employeeHasActiveEquipmentLoans_(employeeId, employeeName) {
  const rows = getRows_(SHEETS.EQUIPMENT_LEDGER);
  for (var index = 0; index < rows.length; index++) {
    if (
      (
        String(rows[index].EmployeeID || "").trim() === String(employeeId || "").trim() ||
        (
          !String(rows[index].EmployeeID || "").trim() &&
          String(rows[index].IssuedTo) === String(employeeName)
        )
      ) &&
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

function syncEmployeeAssignments_(employeeId, qualificationIds, drivingLicenseIds) {
  const nextQualificationIds = normalizeIdArray_(qualificationIds);
  const nextDrivingLicenseIds = normalizeIdArray_(drivingLicenseIds);

  validateQualificationIds_(nextQualificationIds);
  validateDrivingLicenseIds_(nextDrivingLicenseIds);

  replaceAssignmentRows_(
    SHEETS.EMPLOYEE_QUALIFICATIONS,
    "QualificationID",
    employeeId,
    nextQualificationIds
  );
  replaceAssignmentRows_(
    SHEETS.EMPLOYEE_DRIVING_LICENSES,
    "DrivingLicenseID",
    employeeId,
    nextDrivingLicenseIds
  );
}

function replaceAssignmentRows_(sheetName, valueColumn, employeeId, values) {
  deleteRow_(sheetName, "EmployeeID", employeeId);
  values.forEach(function (value) {
    appendRow_(sheetName, {
      EmployeeID: employeeId,
      [valueColumn]: value,
    });
  });
}

function normalizeIdArray_(values) {
  const list = Array.isArray(values) ? values : [];
  const seen = {};
  return list.reduce(function (output, value) {
    const normalized = String(value || "").trim();
    if (!normalized || seen[normalized]) {
      return output;
    }
    seen[normalized] = true;
    output.push(normalized);
    return output;
  }, []);
}

function validateQualificationIds_(qualificationIds) {
  qualificationIds.forEach(function (qualificationId) {
    if (!findValueById_(SHEETS.QUALIFICATIONS, qualificationId, "Name")) {
      throw new Error("Qualification not found");
    }
  });
}

function validateDrivingLicenseIds_(drivingLicenseIds) {
  drivingLicenseIds.forEach(function (drivingLicenseId) {
    if (!findValueById_(SHEETS.DRIVING_LICENSES, drivingLicenseId, "Name")) {
      throw new Error("Driving license not found");
    }
  });
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

function normalizeEmployeeStatus_(value) {
  return value === "reserve" || value === "inactive" ? value : "active";
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

function getSupplyApartmentsData_() {
  return getSupplyRows_(
    SUPPLY_SHEETS.APARTMENTS,
    ["apartment_id", "location", "mission", "type", "active"]
  )
    .map(normalizeSupplyApartmentRow_)
    .filter(function (row) { return row.active; })
    .sort(function (a, b) {
      const locationCompare = a.location.localeCompare(b.location, "he");
      if (locationCompare !== 0) {
        return locationCompare;
      }
      return a.mission.localeCompare(b.mission, "he");
    });
}

function getAllSupplyApartmentRows_() {
  return getSupplyRows_(SUPPLY_SHEETS.APARTMENTS, ["apartment_id"]);
}

function getAllSupplyStandardItemRows_() {
  return getSupplyRows_(SUPPLY_SHEETS.STANDARD_ITEMS, ["standard_item_id", "apartment_id"]);
}

function findSupplyApartmentRowById_(apartmentId) {
  const rows = getAllSupplyApartmentRows_();

  for (var index = 0; index < rows.length; index++) {
    if (stringValue_(rows[index].apartment_id) === String(apartmentId)) {
      return rows[index];
    }
  }

  return null;
}

function findSupplyStandardItemRowById_(standardItemId) {
  const rows = getAllSupplyStandardItemRows_();

  for (var index = 0; index < rows.length; index++) {
    if (stringValue_(rows[index].standard_item_id) === String(standardItemId)) {
      return rows[index];
    }
  }

  return null;
}

function appendSupplyRow_(sheetName, record) {
  const sheet = getSupplySheet_(sheetName);
  const headers = getSheetHeaders_(sheet);
  const row = headers.map(function (header) {
    return record[header] !== undefined ? record[header] : "";
  });
  sheet.appendRow(row);
}

function updateSupplyRowByField_(sheetName, keyColumn, keyValue, updates) {
  const sheet = getSupplySheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length === 0) {
    throw new Error("Supply sheet is missing a header row: " + sheetName);
  }

  const headers = getSheetHeaders_(sheet);
  const keyIndex = headers.indexOf(keyColumn);

  if (keyIndex === -1) {
    throw new Error("Supply column not found: " + keyColumn + " in " + sheetName);
  }

  for (var rowIndex = 1; rowIndex < values.length; rowIndex++) {
    if (String(values[rowIndex][keyIndex]) !== String(keyValue)) {
      continue;
    }

    Object.keys(updates).forEach(function (columnName) {
      const columnIndex = headers.indexOf(columnName);
      if (columnIndex !== -1) {
        sheet.getRange(rowIndex + 1, columnIndex + 1).setValue(updates[columnName]);
      }
    });
    return true;
  }

  throw new Error("Supply row not found in " + sheetName + ": " + keyValue);
}

function buildSupplyApartmentRecord_(payload, existingRecord) {
  const source = existingRecord || {};
  const apartmentId = stringValue_(payload.apartment_id || payload.apartmentId || source.apartment_id) || generateSupplyApartmentId_();
  const location = stringValue_(payload.location || source.location);
  const mission = stringValue_(payload.mission || source.mission);
  const type = stringValue_(payload.type || source.type);
  const notes = stringValue_(payload.notes !== undefined ? payload.notes : source.notes);
  const reportToken = stringValue_(payload.report_token || payload.reportToken || source.report_token) || generateSupplyReportToken_();
  const createdAt = stringValue_(source.created_at) || nowIsoString_();
  const updatedAt = nowIsoString_();
  const active = payload.active === undefined ? parseSupplyActiveValue_(source.active || true) : Boolean(payload.active);

  if (!location) {
    throw new Error("Missing supply apartment location");
  }
  if (!mission) {
    throw new Error("Missing supply apartment mission");
  }
  if (!type) {
    throw new Error("Missing supply apartment type");
  }

  return {
    apartment_id: apartmentId,
    location: location,
    mission: mission,
    type: type,
    notes: notes,
    report_token: reportToken,
    active: active,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function buildSupplyStandardItemRecord_(payload, existingRecord) {
  const source = existingRecord || {};
  const apartmentId = stringValue_(payload.apartment_id || payload.apartmentId || source.apartment_id);
  const category = stringValue_(payload.category || source.category);
  const itemName = stringValue_(payload.item_name || payload.itemName || source.item_name);
  const requiredValue = stringValue_(payload.required_value !== undefined ? payload.required_value : payload.requiredValue !== undefined ? payload.requiredValue : source.required_value);
  const requiredType = normalizeSupplyRequiredType_(payload.required_type || payload.requiredType || source.required_type);
  const photoRequired = payload.photo_required === undefined
    ? payload.photoRequired === undefined
      ? parseSupplyActiveValue_(source.photo_required)
      : Boolean(payload.photoRequired)
    : Boolean(payload.photo_required);
  const active = payload.active === undefined ? parseSupplyActiveValue_(source.active || true) : Boolean(payload.active);
  const notes = stringValue_(payload.notes !== undefined ? payload.notes : source.notes);
  const standardItemId = stringValue_(payload.standard_item_id || payload.standardItemId || source.standard_item_id) || generateSupplyStandardItemId_(apartmentId, itemName);

  if (!apartmentId) {
    throw new Error("Missing supply apartment ID");
  }
  if (!category) {
    throw new Error("Missing supply category");
  }
  if (!itemName) {
    throw new Error("Missing supply item name");
  }
  if (!isAllowedSupplyCategory_(category)) {
    throw new Error("Invalid supply category");
  }

  return {
    standard_item_id: standardItemId,
    apartment_id: apartmentId,
    category: category,
    item_name: itemName,
    required_value: requiredValue,
    required_type: requiredType,
    photo_required: photoRequired,
    active: active,
    notes: notes,
  };
}

function isAllowedSupplyCategory_(category) {
  const allowedCategories = ["מקרר", "ציוד ניקוי אקסטרה", "מצעים", "חריגים", "ציוד כללי"];
  return allowedCategories.indexOf(String(category)) !== -1;
}

function generateSupplyApartmentId_() {
  return "apt_" + new Date().getTime() + "_" + Math.floor(Math.random() * 10000);
}

function generateSupplyReportToken_() {
  return Utilities.getUuid().replace(/-/g, "").slice(0, 24);
}

function generateSupplyStandardItemId_(apartmentId, itemName) {
  var normalizedName = String(itemName || "").trim();
  if (normalizedName) {
    normalizedName = normalizedName
      .replace(/\s+/g, "_")
      .replace(/[^\u0590-\u05FFA-Za-z0-9_/-]/g, "")
      .slice(0, 24);
  }
  return "std_" + String(apartmentId || "apt").slice(0, 20) + "_" + (normalizedName || Utilities.getUuid().slice(0, 8));
}

function nowIsoString_() {
  return new Date().toISOString();
}

function getSupplyDemoData_() {
  return [
    {
      apartment_id: "apt_ramat_hashavim",
      location: "רמת השבים",
      mission: "אח + אורן",
      type: "דירה",
      notes: "",
      report_token: "demo_ramat_hashavim",
      active: true,
      standard_items: [
        supplySeedItem_("std_ramat_hashavim_bed", "apt_ramat_hashavim", "מצעים", "מיטה", "13", "quantity", true, ""),
        supplySeedItem_("std_ramat_hashavim_bed_double", "apt_ramat_hashavim", "מצעים", "מיטה זוגית/סדין זוגי", "3 גדולים", "text", true, ""),
        supplySeedItem_("std_ramat_hashavim_fridge", "apt_ramat_hashavim", "מקרר", "מיקרה/מקרר", "1", "quantity", true, ""),
        supplySeedItem_("std_ramat_hashavim_tami4", "apt_ramat_hashavim", "ציוד כללי", "תמי 4", "1", "quantity", false, ""),
        supplySeedItem_("std_ramat_hashavim_armchair", "apt_ramat_hashavim", "ציוד כללי", "כורסה", "1", "quantity", false, ""),
        supplySeedItem_("std_ramat_hashavim_kettle", "apt_ramat_hashavim", "ציוד כללי", "קומקום", "1", "quantity", false, ""),
        supplySeedItem_("std_ramat_hashavim_hotplate", "apt_ramat_hashavim", "ציוד כללי", "מיחם", "1", "quantity", false, ""),
      ],
    },
    {
      apartment_id: "apt_kfar_haoranim",
      location: "כפר האורנים",
      mission: "חוסם + דפנה",
      type: "דירה",
      notes: "",
      report_token: "demo_kfar_haoranim",
      active: true,
      standard_items: [
        supplySeedItem_("std_kfar_haoranim_bed", "apt_kfar_haoranim", "מצעים", "מיטה", "5", "quantity", true, ""),
        supplySeedItem_("std_kfar_haoranim_fridge", "apt_kfar_haoranim", "מקרר", "מקרר", "גדול", "text", true, ""),
        supplySeedItem_("std_kfar_haoranim_tami4", "apt_kfar_haoranim", "ציוד כללי", "תמי 4", "1", "quantity", false, ""),
        supplySeedItem_("std_kfar_haoranim_armchair", "apt_kfar_haoranim", "ציוד כללי", "כורסה", "1", "quantity", false, ""),
        supplySeedItem_("std_kfar_haoranim_kettle", "apt_kfar_haoranim", "ציוד כללי", "קומקום", "1", "quantity", false, ""),
        supplySeedItem_("std_kfar_haoranim_hotplate", "apt_kfar_haoranim", "ציוד כללי", "מיחם", "1", "quantity", false, ""),
      ],
    },
    {
      apartment_id: "apt_ezri",
      location: "עזרי",
      mission: "ורד",
      type: "דירה",
      notes: "תמי 4 תקול",
      report_token: "demo_ezri",
      active: true,
      standard_items: [
        supplySeedItem_("std_ezri_bed", "apt_ezri", "מצעים", "מיטה", "קיים", "exists", true, ""),
        supplySeedItem_("std_ezri_fridge", "apt_ezri", "מקרר", "מקרר", "קיים", "exists", true, ""),
        supplySeedItem_("std_ezri_tami4", "apt_ezri", "ציוד כללי", "תמי 4", "קיים", "exists", false, ""),
        supplySeedItem_("std_ezri_armchair", "apt_ezri", "ציוד כללי", "כורסה", "קיים", "exists", false, ""),
        supplySeedItem_("std_ezri_kettle", "apt_ezri", "ציוד כללי", "קומקום", "קיים", "exists", false, ""),
      ],
    },
    {
      apartment_id: "apt_shaar_hanoy",
      location: "שער הנוי",
      mission: "אגד",
      type: "דירה",
      notes: "",
      report_token: "demo_shaar_hanoy",
      active: true,
      standard_items: [
        supplySeedItem_("std_shaar_hanoy_bed", "apt_shaar_hanoy", "מצעים", "מיטה", "1", "quantity", true, ""),
        supplySeedItem_("std_shaar_hanoy_fridge", "apt_shaar_hanoy", "מקרר", "מקרר", "גדול", "text", true, ""),
        supplySeedItem_("std_shaar_hanoy_tami4", "apt_shaar_hanoy", "ציוד כללי", "תמי 4", "1", "quantity", false, ""),
        supplySeedItem_("std_shaar_hanoy_armchair", "apt_shaar_hanoy", "ציוד כללי", "כורסה", "1", "quantity", false, ""),
        supplySeedItem_("std_shaar_hanoy_entrance", "apt_shaar_hanoy", "ציוד כללי", "כניסה", "1", "quantity", false, ""),
        supplySeedItem_("std_shaar_hanoy_hotplate", "apt_shaar_hanoy", "ציוד כללי", "מיחם", "1", "quantity", false, ""),
      ],
    },
    {
      apartment_id: "apt_givaa",
      location: "גבעה",
      mission: "אנקיפסום",
      type: "דירה",
      notes: "",
      report_token: "demo_givaa",
      active: true,
      standard_items: [
        supplySeedItem_("std_givaa_bed", "apt_givaa", "מצעים", "מיטה", "1", "quantity", true, ""),
        supplySeedItem_("std_givaa_fridge", "apt_givaa", "מקרר", "מקרר", "גדול", "text", true, ""),
        supplySeedItem_("std_givaa_tami4", "apt_givaa", "ציוד כללי", "תמי 4", "1", "quantity", false, ""),
        supplySeedItem_("std_givaa_armchair", "apt_givaa", "ציוד כללי", "כורסה", "1", "quantity", false, ""),
        supplySeedItem_("std_givaa_kettle", "apt_givaa", "ציוד כללי", "קומקום", "1", "quantity", false, ""),
        supplySeedItem_("std_givaa_hotplate", "apt_givaa", "ציוד כללי", "מיחם", "1", "quantity", false, ""),
      ],
    },
    {
      apartment_id: "apt_maale_gamla",
      location: "מעלה גמלא",
      mission: "אדמונית",
      type: "דירה",
      notes: "",
      report_token: "demo_maale_gamla",
      active: true,
      standard_items: [
        supplySeedItem_("std_maale_gamla_bed", "apt_maale_gamla", "מצעים", "מיטה", "1", "quantity", true, ""),
        supplySeedItem_("std_maale_gamla_fridge", "apt_maale_gamla", "מקרר", "מקרר", "קיים", "text", true, ""),
        supplySeedItem_("std_maale_gamla_tami4", "apt_maale_gamla", "ציוד כללי", "תמי 4", "קיים", "exists", false, ""),
        supplySeedItem_("std_maale_gamla_armchair", "apt_maale_gamla", "ציוד כללי", "כורסה", "קיים", "exists", false, ""),
        supplySeedItem_("std_maale_gamla_entrance", "apt_maale_gamla", "ציוד כללי", "כניסה", "1", "quantity", false, ""),
        supplySeedItem_("std_maale_gamla_kettle", "apt_maale_gamla", "ציוד כללי", "קומקום", "קיים", "exists", false, ""),
        supplySeedItem_("std_maale_gamla_hotplate", "apt_maale_gamla", "ציוד כללי", "מיחם", "1", "quantity", false, ""),
      ],
    },
    {
      apartment_id: "apt_oferet",
      location: "עופרת",
      mission: "מוריה",
      type: "דירה",
      notes: "",
      report_token: "demo_oferet",
      active: true,
      standard_items: [
        supplySeedItem_("std_oferet_bed", "apt_oferet", "מצעים", "מיטה", "1", "quantity", true, ""),
        supplySeedItem_("std_oferet_fridge", "apt_oferet", "מקרר", "מקרר", "גדול", "text", true, ""),
        supplySeedItem_("std_oferet_tami4", "apt_oferet", "ציוד כללי", "תמי 4", "1", "quantity", false, ""),
        supplySeedItem_("std_oferet_armchair", "apt_oferet", "ציוד כללי", "כורסה", "1", "quantity", false, ""),
        supplySeedItem_("std_oferet_kettle", "apt_oferet", "ציוד כללי", "קומקום", "1", "quantity", false, ""),
        supplySeedItem_("std_oferet_hotplate", "apt_oferet", "ציוד כללי", "מיחם", "1", "quantity", false, ""),
      ],
    },
  ];
}

function supplySeedItem_(standardItemId, apartmentId, category, itemName, requiredValue, requiredType, photoRequired, notes) {
  return {
    standard_item_id: standardItemId,
    apartment_id: apartmentId,
    category: category,
    item_name: itemName,
    required_value: requiredValue,
    required_type: requiredType,
    photo_required: photoRequired,
    notes: notes,
    active: true,
  };
}

function getSupplyStandardItemsData_(apartmentId) {
  return getSupplyRows_(
    SUPPLY_SHEETS.STANDARD_ITEMS,
    [
      "standard_item_id",
      "apartment_id",
      "category",
      "item_name",
      "required_value",
      "required_type",
      "photo_required",
      "active",
    ]
  )
    .map(normalizeSupplyStandardItemRow_)
    .filter(function (row) {
      return row.active && row.apartment_id === String(apartmentId);
    })
    .sort(function (a, b) {
      const categoryCompare = a.category.localeCompare(b.category, "he");
      if (categoryCompare !== 0) {
        return categoryCompare;
      }
      return a.item_name.localeCompare(b.item_name, "he");
    });
}

function getSupplyReportsByApartmentData_(apartmentId) {
  return getSupplyRows_(
    SUPPLY_SHEETS.REPORTS,
    ["report_id", "apartment_id", "reported_at"]
  )
    .map(normalizeSupplyReportRow_)
    .filter(function (row) {
      return row.apartment_id === String(apartmentId);
    })
    .sort(function (a, b) {
      return supplyDateSortDesc_(a.reported_at, b.reported_at);
    });
}

function getSupplyReportDetailsData_(reportId) {
  const reports = getSupplyRows_(
    SUPPLY_SHEETS.REPORTS,
    ["report_id", "apartment_id", "reported_at"]
  ).map(normalizeSupplyReportRow_);
  const report = reports.find(function (row) {
    return row.report_id === String(reportId);
  });

  if (!report) {
    return null;
  }

  const apartment = findSupplyApartmentById_(report.apartment_id);
  if (!apartment) {
    throw new Error("Supply apartment not found for report: " + report.apartment_id);
  }

  const items = getSupplyRows_(
    SUPPLY_SHEETS.REPORT_ITEMS,
    ["report_item_id", "report_id", "item_name", "reported_status"]
  )
    .map(normalizeSupplyReportItemRow_)
    .filter(function (row) {
      return row.report_id === report.report_id;
    });

  const photos = getSupplyRows_(
    SUPPLY_SHEETS.REPORT_PHOTOS,
    ["photo_id", "report_id", "apartment_id", "category"]
  )
    .map(normalizeSupplyReportPhotoRow_)
    .filter(function (row) {
      return row.report_id === report.report_id;
    })
    .sort(function (a, b) {
      return supplyDateSortDesc_(a.uploaded_at, b.uploaded_at);
    });

  return {
    report: report,
    apartment: apartment,
    items: items,
    photos: photos,
  };
}

function findSupplyApartmentById_(apartmentId) {
  const apartments = getSupplyApartmentsData_();

  for (var index = 0; index < apartments.length; index++) {
    if (apartments[index].apartment_id === String(apartmentId)) {
      return apartments[index];
    }
  }

  return null;
}

function normalizeSupplyApartmentRow_(row) {
  return {
    apartment_id: stringValue_(row.apartment_id),
    location: stringValue_(row.location),
    mission: stringValue_(row.mission),
    type: stringValue_(row.type),
    notes: optionalString_(row.notes),
    report_token: optionalString_(row.report_token),
    active: parseSupplyActiveValue_(row.active),
    created_at: optionalDateTimeValue_(row.created_at),
    updated_at: optionalDateTimeValue_(row.updated_at),
  };
}

function normalizeSupplyStandardItemRow_(row) {
  return {
    standard_item_id: stringValue_(row.standard_item_id),
    apartment_id: stringValue_(row.apartment_id),
    category: stringValue_(row.category),
    item_name: stringValue_(row.item_name),
    required_value: optionalString_(row.required_value),
    required_type: normalizeSupplyRequiredType_(row.required_type),
    photo_required: parseSupplyActiveValue_(row.photo_required),
    active: parseSupplyActiveValue_(row.active),
    notes: optionalString_(row.notes),
  };
}

function normalizeSupplyReportRow_(row) {
  return {
    report_id: stringValue_(row.report_id),
    apartment_id: stringValue_(row.apartment_id),
    reporter_initials: optionalString_(row.reporter_initials),
    reported_at: dateTimeValue_(row.reported_at),
    general_notes: optionalString_(row.general_notes),
    overall_status: optionalString_(row.overall_status),
  };
}

function normalizeSupplyReportItemRow_(row) {
  return {
    report_item_id: stringValue_(row.report_item_id),
    report_id: stringValue_(row.report_id),
    standard_item_id: optionalString_(row.standard_item_id),
    item_name: stringValue_(row.item_name),
    required_value: optionalString_(row.required_value),
    reported_status: normalizeSupplyReportedStatus_(row.reported_status),
    actual_value: optionalString_(row.actual_value),
    item_notes: optionalString_(row.item_notes),
  };
}

function normalizeSupplyReportPhotoRow_(row) {
  return {
    photo_id: stringValue_(row.photo_id),
    report_id: stringValue_(row.report_id),
    apartment_id: stringValue_(row.apartment_id),
    category: normalizeSupplyPhotoCategory_(row.category),
    drive_file_id: optionalString_(row.drive_file_id),
    drive_url: optionalString_(row.drive_url),
    uploaded_at: optionalDateTimeValue_(row.uploaded_at),
    notes: optionalString_(row.notes),
  };
}

function normalizeSupplyRequiredType_(value) {
  const normalized = stringValue_(value);
  return normalized === "quantity" || normalized === "text" ? normalized : "exists";
}

function normalizeSupplyReportedStatus_(value) {
  const normalized = stringValue_(value);
  return normalized === "ok" || normalized === "missing" || normalized === "partial" || normalized === "not_relevant"
    ? normalized
    : "not_relevant";
}

function normalizeSupplyPhotoCategory_(value) {
  const normalized = stringValue_(value);
  return normalized === "מקרר" || normalized === "ציוד ניקוי אקסטרה" || normalized === "מצעים" || normalized === "חריגים"
    ? normalized
    : "חריגים";
}

function parseSupplyActiveValue_(value) {
  if (value === true || value === 1) {
    return true;
  }
  const normalized = stringValue_(value).toLowerCase();
  return normalized === "true" || normalized === "1";
}

function supplyDateSortDesc_(left, right) {
  return parseDateTimeToTimestamp_(right) - parseDateTimeToTimestamp_(left);
}

function parseDateTimeToTimestamp_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return value.getTime();
  }

  const normalized = stringValue_(value);
  if (!normalized) {
    return 0;
  }

  const parsed = new Date(normalized);
  return isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function dateTimeValue_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return value.toISOString();
  }
  return stringValue_(value);
}

function optionalDateTimeValue_(value) {
  const normalized = dateTimeValue_(value);
  return normalized ? normalized : undefined;
}

function getSupplyRows_(sheetName, requiredColumns) {
  const sheet = getSupplySheet_(sheetName);
  return getSheetRowsWithHeaders_(sheet, requiredColumns);
}

function getSupplySheet_(sheetName) {
  const spreadsheet = getSupplySpreadsheet_();
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error("Supply sheet not found: " + sheetName);
  }
  return sheet;
}

function getSupplySpreadsheet_() {
  const spreadsheetId = getSupplySpreadsheetId_();
  if (!spreadsheetId) {
    throw new Error("Missing supply spreadsheet ID");
  }

  try {
    return SpreadsheetApp.openById(spreadsheetId);
  } catch (err) {
    throw new Error("Unable to open supply spreadsheet: " + spreadsheetId + ". " + String(err));
  }
}

function getSupplySpreadsheetId_() {
  return getScriptPropertyWithFallback_(
    SUPPLY_CONFIG.SPREADSHEET_ID_PROPERTY,
    SUPPLY_CONFIG.DEFAULT_SPREADSHEET_ID
  );
}

function getSupplyReportsFolderId_() {
  return getScriptPropertyWithFallback_(
    SUPPLY_CONFIG.REPORTS_FOLDER_ID_PROPERTY,
    SUPPLY_CONFIG.DEFAULT_REPORTS_FOLDER_ID
  );
}

function getScriptPropertyWithFallback_(propertyName, fallbackValue) {
  const properties = PropertiesService.getScriptProperties();
  const configuredValue = properties ? String(properties.getProperty(propertyName) || "").trim() : "";
  return configuredValue || String(fallbackValue || "").trim();
}

function getSheetRowsWithHeaders_(sheet, requiredColumns) {
  const values = sheet.getDataRange().getValues();
  if (values.length === 0) {
    throw new Error("Sheet is missing a header row: " + sheet.getName());
  }

  const headers = values[0].map(function (header) {
    return String(header || "").trim();
  });

  assertSheetHasRequiredColumns_(sheet.getName(), headers, requiredColumns || []);

  if (values.length === 1) {
    return [];
  }

  return values.slice(1).map(function (row) {
    const item = {};
    headers.forEach(function (header, index) {
      item[header] = row[index];
    });
    return item;
  });
}

function assertSheetHasRequiredColumns_(sheetName, headers, requiredColumns) {
  const missingColumns = requiredColumns.filter(function (columnName) {
    return headers.indexOf(columnName) === -1;
  });

  if (missingColumns.length > 0) {
    throw new Error(
      "Sheet '" + sheetName + "' is missing required columns: " + missingColumns.join(", ")
    );
  }
}

function stringValue_(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function dateOnlyValue_(value) {
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }

  return stringValue_(value);
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
