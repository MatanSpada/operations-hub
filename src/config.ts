/**
 * src/config.ts
 * =============
 * Central configuration for the Management Dashboard.
 *
 * ─── WHERE TO CHANGE THINGS ───────────────────────────────────────────
 * • GOOGLE_APPS_SCRIPT_URL  → replace with your deployed GAS web app URL
 * • TAB_LABELS              → add/rename navigation tabs here
 * • SHEET_NAMES             → update if you rename a Google Sheet tab
 * • ALERT_THRESHOLDS        → tune alert sensitivity here
 * ─────────────────────────────────────────────────────────────────────
 */

// ── Google Apps Script ──────────────────────────────────────────────
// ⚠️ REPLACE THIS with your deployed Apps Script Web App URL
// How to get it: Apps Script → Deploy → Manage Deployments → Web App URL
export const GOOGLE_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/YOUR_SCRIPT_ID_HERE/exec";

// ── Google Sheet Names ──────────────────────────────────────────────
// UPDATE SHEET COLUMN MAP HERE — these must exactly match the tab names
// in your Google Spreadsheet
export const SHEET_NAMES = {
  employees: "Employees",
  departments: "Departments",
  vehicles: "Vehicles",
  vehicleTrips: "Vehicle_Trips",
  equipmentCatalog: "Equipment_Catalog",
  equipmentLedger: "Equipment_Ledger",
  foodCatalog: "Food_Catalog",
  foodTransactions: "Food_Transactions",
  apartments: "Apartments",
  qualifications: "Qualifications",
  employeeQualifications: "Employee_Qualifications",
} as const;

// ── Navigation Tabs ──────────────────────────────────────────────────
// ADD NEW TAB HERE — add an entry to TAB_LABELS and add the matching
// TabId to the TabId type in src/types.ts
export const TAB_LABELS: Record<string, string> = {
  dashboard: "לוח בקרה",
  food: "מזון ודירות",
  equipment: "ציוד חשמלי",
  vehicles: "רכבים",
  workforce: "כוח אדם ומילואים",
  qualifications: "הכשרות",
  settings: "הגדרות",
};

// ── Alert Thresholds ────────────────────────────────────────────────
// ALERT RULES START HERE — tune these values to change when alerts fire
export const ALERT_THRESHOLDS = {
  // Workforce: days before reserve-duty end to show a warning
  reserveDutyWarningDays: 14,

  // Food: minimum stock quantity before "low stock" alert
  foodLowStockQty: 5,

  // Apartments: max days since last supply before alert
  apartmentStaleSupplyDays: 7,

  // Equipment: if overdue by this many days, show danger (0 = immediately overdue)
  equipmentOverdueDays: 0,
};

// ── App Metadata ─────────────────────────────────────────────────────
export const APP_META = {
  name: "מערכת ניהול תפעול",
  version: "1.0.0",
  gasDocsUrl:
    "https://developers.google.com/apps-script/guides/web",
  sheetsDocsUrl:
    "https://support.google.com/docs/answer/6000292",
};
