/**
 * apps-script/Code.gs
 * ====================
 * Google Apps Script backend for the Management Dashboard.
 * Paste this into your Apps Script editor (Extensions > Apps Script).
 *
 * SETUP:
 * 1. Open your Google Sheet → Extensions → Apps Script
 * 2. Delete the default code and paste this entire file
 * 3. Click Deploy → New Deployment → Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 4. Copy the Web App URL into src/config.ts → GOOGLE_APPS_SCRIPT_URL
 *
 * ADD NEW GET ACTION: add a case in doGet() and a helper function below
 * ADD NEW POST ACTION: add a case in doPost() and a helper function below
 * ADD NEW SHEET: add the sheet to Google Sheets, then add a helper here
 */

// ── Sheet name constants — UPDATE THESE if you rename a sheet tab ────
const SHEETS = {
  EMPLOYEES:               "Employees",
  DEPARTMENTS:             "Departments",
  VEHICLES:                "Vehicles",
  VEHICLE_TRIPS:           "Vehicle_Trips",
  EQUIPMENT_CATALOG:       "Equipment_Catalog",
  EQUIPMENT_LEDGER:        "Equipment_Ledger",
  FOOD_CATALOG:            "Food_Catalog",
  FOOD_TRANSACTIONS:       "Food_Transactions",
  APARTMENTS:              "Apartments",
  QUALIFICATIONS:          "Qualifications",
  EMPLOYEE_QUALIFICATIONS: "Employee_Qualifications",
};

// ── GET Endpoint ─────────────────────────────────────────────────────
function doGet(e) {
  const action = e.parameter.action;
  try {
    if (action === "getInitialData") {
      return jsonResponse({
        success: true,
        data: {
          employees:               mapRows(SHEETS.EMPLOYEES),
          departments:             mapRows(SHEETS.DEPARTMENTS),
          vehicles:                mapRows(SHEETS.VEHICLES),
          equipmentTypes:          mapRows(SHEETS.EQUIPMENT_CATALOG),
          equipmentLedger:         mapRows(SHEETS.EQUIPMENT_LEDGER),
          foodProducts:            mapRows(SHEETS.FOOD_CATALOG),
          foodTransactions:        mapRows(SHEETS.FOOD_TRANSACTIONS),
          apartments:              mapRows(SHEETS.APARTMENTS),
          qualifications:          mapRows(SHEETS.QUALIFICATIONS),
          employeeQualifications:  mapRows(SHEETS.EMPLOYEE_QUALIFICATIONS),
        }
      });
    }
    return jsonResponse({ success: false, error: "Unknown action: " + action });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ── POST Endpoint ─────────────────────────────────────────────────────
// ADD NEW POST ACTIONS HERE ↓
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (action === "checkoutVehicle") {
      updateRow(SHEETS.VEHICLES, "Plate", payload.plate, {
        Status: "in_use",
        CurrentDriver: payload.driver,
        Origin: payload.origin,
        Destination: payload.destination,
        DepartureTime: payload.departureTime,
      });
      appendRow(SHEETS.VEHICLE_TRIPS, {
        ID: generateId(),
        Plate: payload.plate,
        Driver: payload.driver,
        Origin: payload.origin,
        Destination: payload.destination,
        DepartureTime: payload.departureTime,
      });
      return jsonResponse({ success: true });
    }

    if (action === "returnVehicle") {
      updateRow(SHEETS.VEHICLES, "Plate", payload.plate, {
        Status: "available",
        CurrentDriver: "",
        Origin: "",
        Destination: "",
        DepartureTime: "",
      });
      return jsonResponse({ success: true });
    }

    if (action === "updateVehicleStatus") {
      updateRow(SHEETS.VEHICLES, "Plate", payload.plate, { Status: payload.status });
      return jsonResponse({ success: true });
    }

    if (action === "issueEquipment") {
      appendRow(SHEETS.EQUIPMENT_LEDGER, {
        ID: generateId(),
        EquipmentID: payload.equipmentId,
        Quantity: payload.quantity,
        IssuedTo: payload.issuedTo,
        Department: payload.department,
        IssueDate: new Date().toISOString().split("T")[0],
        ExpectedReturnDate: payload.expectedReturnDate || "",
        ReturnDate: "",
        Status: "issued",
      });
      return jsonResponse({ success: true });
    }

    if (action === "returnEquipment") {
      updateRow(SHEETS.EQUIPMENT_LEDGER, "ID", payload.ledgerId, {
        Status: "returned",
        ReturnDate: new Date().toISOString().split("T")[0],
      });
      return jsonResponse({ success: true });
    }

    if (action === "addFoodShipment") {
      appendRow(SHEETS.FOOD_TRANSACTIONS, {
        ID: generateId(),
        Date: new Date().toISOString().split("T")[0],
        Type: "in",
        ProductID: payload.productId,
        Quantity: payload.quantity,
        Destination: "",
      });
      return jsonResponse({ success: true });
    }

    if (action === "supplyApartment") {
      appendRow(SHEETS.FOOD_TRANSACTIONS, {
        ID: generateId(),
        Date: new Date().toISOString().split("T")[0],
        Type: "out",
        ProductID: payload.productId,
        Quantity: payload.quantity,
        Destination: payload.apartmentId,
      });
      updateRow(SHEETS.APARTMENTS, "ID", payload.apartmentId, {
        LastSupplied: new Date().toISOString().split("T")[0],
      });
      return jsonResponse({ success: true });
    }

    if (action === "addReserveDuty") {
      updateRow(SHEETS.EMPLOYEES, "ID", payload.employeeId, {
        Status: "reserve",
        ReserveStartDate: payload.startDate,
        ReserveEndDate: payload.endDate,
      });
      return jsonResponse({ success: true });
    }

    if (action === "endReserveDuty") {
      updateRow(SHEETS.EMPLOYEES, "ID", payload.employeeId, {
        Status: "active",
        ReserveStartDate: "",
        ReserveEndDate: "",
      });
      return jsonResponse({ success: true });
    }

    if (action === "assignQualification") {
      appendRow(SHEETS.EMPLOYEE_QUALIFICATIONS, {
        EmployeeID: payload.employeeId,
        QualificationID: payload.qualificationId,
      });
      return jsonResponse({ success: true });
    }

    if (action === "removeQualification") {
      deleteRow(SHEETS.EMPLOYEE_QUALIFICATIONS, "EmployeeID", payload.employeeId,
        (row) => row["QualificationID"] === payload.qualificationId);
      return jsonResponse({ success: true });
    }

    // ADD NEW POST ACTIONS ABOVE THIS LINE ↑
    return jsonResponse({ success: false, error: "Unknown action: " + action });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ── Helper: Read all rows from a sheet as array of objects ───────────
function mapRows(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0];
  return data.slice(1).map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

// ── Helper: Append a new row ─────────────────────────────────────────
function appendRow(sheetName, obj) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => obj[h] !== undefined ? obj[h] : "");
  sheet.appendRow(row);
}

// ── Helper: Update matching row ──────────────────────────────────────
function updateRow(sheetName, keyCol, keyVal, updates) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet not found: " + sheetName);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const keyIdx = headers.indexOf(keyCol);
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][keyIdx]) === String(keyVal)) {
      Object.keys(updates).forEach(k => {
        const ci = headers.indexOf(k);
        if (ci > -1) sheet.getRange(i + 1, ci + 1).setValue(updates[k]);
      });
      return true;
    }
  }
  return false;
}

// ── Helper: Delete a matching row ───────────────────────────────────
function deleteRow(sheetName, keyCol, keyVal, extraFilter) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return;
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const keyIdx = headers.indexOf(keyCol);
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][keyIdx]) === String(keyVal)) {
      const rowObj = {};
      headers.forEach((h, j) => { rowObj[h] = data[i][j]; });
      if (!extraFilter || extraFilter(rowObj)) {
        sheet.deleteRow(i + 1);
      }
    }
  }
}

// ── Helper: Generate simple unique ID ────────────────────────────────
function generateId() {
  return Utilities.getUuid();
}

// ── Helper: Wrap response as JSON ────────────────────────────────────
function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
