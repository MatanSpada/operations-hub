/**
 * src/apps-script/Code.gs
 * =======================
 * Google Apps Script backend for the Operations Hub dashboard.
 *
 * Recommended sheet headers:
 * Departments: ID, Name
 * Employees: ID, Name, Department, Status, ReserveStartDate, ReserveEndDate, Phone, Role
 * Vehicles: Plate, Status, CurrentDriver, Origin, Destination, DepartureTime, Notes
 * Vehicle_Trips: ID, Plate, Driver, Origin, Destination, DepartureTime, ReturnTime
 * Equipment_Catalog: ID, Name, TotalQuantity
 * Equipment_Ledger: ID, EquipmentID, EquipmentName, Quantity, IssuedTo, Department, IssueDate, ExpectedReturnDate, ReturnDate, Status
 * Food_Catalog: ID, Name, Category
 * Food_Transactions: ID, Date, Type, ProductID, ProductName, Quantity, DestinationApartmentId, DestinationName
 * Apartments: ID, Name, LastSupplied
 * Qualifications: ID, Name
 * Employee_Qualifications: EmployeeID, QualificationID
 */

const SHEETS = {
  EMPLOYEES: "Employees",
  DEPARTMENTS: "Departments",
  VEHICLES: "Vehicles",
  VEHICLE_TRIPS: "Vehicle_Trips",
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

    if (action === "checkoutVehicle") {
      updateRow_(SHEETS.VEHICLES, "Plate", payload.plate, {
        Status: "in_use",
        CurrentDriver: payload.driver,
        Origin: payload.origin,
        Destination: payload.destination,
        DepartureTime: payload.departureTime,
      });
      appendRow_(SHEETS.VEHICLE_TRIPS, {
        ID: generateId_(),
        Plate: payload.plate,
        Driver: payload.driver,
        Origin: payload.origin,
        Destination: payload.destination,
        DepartureTime: payload.departureTime,
        ReturnTime: "",
      });
      return jsonResponse_({ success: true });
    }

    if (action === "returnVehicle") {
      updateRow_(SHEETS.VEHICLES, "Plate", payload.plate, {
        Status: "available",
        CurrentDriver: "",
        Origin: "",
        Destination: "",
        DepartureTime: "",
      });
      closeLatestVehicleTrip_(payload.plate);
      return jsonResponse_({ success: true });
    }

    if (action === "updateVehicleStatus") {
      updateRow_(SHEETS.VEHICLES, "Plate", payload.plate, { Status: payload.status });
      return jsonResponse_({ success: true });
    }

    if (action === "issueEquipment") {
      appendRow_(SHEETS.EQUIPMENT_LEDGER, {
        ID: generateId_(),
        EquipmentID: payload.equipmentId,
        EquipmentName: getEquipmentName_(payload.equipmentId),
        Quantity: Number(payload.quantity || 0),
        IssuedTo: payload.issuedTo,
        Department: payload.department,
        IssueDate: todayIso_(),
        ExpectedReturnDate: payload.expectedReturnDate || "",
        ReturnDate: "",
        Status: "issued",
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
      const initialQuantity = Number(payload.initialQuantity || 0);

      if (!productName || !category) {
        throw new Error("Missing product name or category");
      }
      if (isNaN(initialQuantity) || initialQuantity < 0) {
        throw new Error("Invalid initial quantity");
      }

      appendRow_(SHEETS.FOOD_CATALOG, {
        ID: productId,
        Name: productName,
        Category: category,
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

      appendFoodTransaction_(payload.productId, "out", Number(payload.quantity || 0), {
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

function buildInitialData_() {
  const departmentsRows = getRows_(SHEETS.DEPARTMENTS);
  const employeesRows = getRows_(SHEETS.EMPLOYEES);
  const vehiclesRows = getRows_(SHEETS.VEHICLES);
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
    employees: employeesRows.map(normalizeEmployee_),
    vehicles: vehiclesRows.map(normalizeVehicle_),
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
    status: stringValue_(row.Status) || "available",
    currentDriver: optionalString_(row.CurrentDriver),
    origin: optionalString_(row.Origin),
    destination: optionalString_(row.Destination),
    departureTime: optionalString_(row.DepartureTime),
    notes: optionalString_(row.Notes),
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

function closeLatestVehicleTrip_(plate) {
  const sheet = getSheet_(SHEETS.VEHICLE_TRIPS);
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return;

  const headers = values[0];
  const plateIndex = headers.indexOf("Plate");
  const returnTimeIndex = headers.indexOf("ReturnTime");

  if (plateIndex === -1 || returnTimeIndex === -1) return;

  for (var rowIndex = values.length - 1; rowIndex >= 1; rowIndex--) {
    if (
      String(values[rowIndex][plateIndex]) === String(plate) &&
      !String(values[rowIndex][returnTimeIndex] || "").trim()
    ) {
      sheet.getRange(rowIndex + 1, returnTimeIndex + 1).setValue(new Date().toISOString());
      return;
    }
  }
}

function getEquipmentName_(equipmentId) {
  return findValueById_(SHEETS.EQUIPMENT_CATALOG, equipmentId, "Name") || String(equipmentId);
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
