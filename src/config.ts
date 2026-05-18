/**
 * src/config.ts
 * =============
 * Central configuration for the Management Dashboard.
 *
 * ─── WHERE TO CHANGE THINGS ───────────────────────────────────────────
 * • VITE_GAS_URL            → set in .env.local or GitHub Actions secrets
 * • VITE_BASE_PATH          → set to /operations-hub/ for GitHub Pages
 * • VITE_USE_MOCK_DATA      → opt into demo mode explicitly
 * • TAB_LABELS              → add/rename navigation tabs here
 * • SHEET_NAMES             → update if you rename a Google Sheet tab
 * • ALERT_THRESHOLDS        → tune alert sensitivity here
 * ─────────────────────────────────────────────────────────────────────
 */

const env = import.meta.env;

// ── Google Apps Script ──────────────────────────────────────────────
// Set this in .env.local / GitHub Secrets as VITE_GAS_URL.
export const GOOGLE_APPS_SCRIPT_URL = env.VITE_GAS_URL?.trim() ?? "";
export const USE_MOCK_DATA = env.VITE_USE_MOCK_DATA === "true";
export const GITHUB_PAGES_BASE_PATH = env.BASE_URL;
export const IS_GAS_CONFIGURED = GOOGLE_APPS_SCRIPT_URL.length > 0;

// ── Google Sheet Names ──────────────────────────────────────────────
// UPDATE SHEET COLUMN MAP HERE — these must exactly match the tab names
// in your Google Spreadsheet
export const SHEET_NAMES = {
  employees: "Employees",
  departments: "Departments",
  drivingLicenses: "Driving_Licenses",
  vehicles: "Vehicles",
  vehicleTrips: "Vehicle_Trips",
  campTasks: "Camp_Tasks",
  equipmentCatalog: "Equipment_Catalog",
  equipmentLedger: "Equipment_Ledger",
  foodCatalog: "Food_Catalog",
  foodTransactions: "Food_Transactions",
  apartments: "Apartments",
  qualifications: "Qualifications",
  employeeQualifications: "Employee_Qualifications",
  employeeDrivingLicenses: "Employee_Driving_Licenses",
} as const;

// ── Navigation Tabs ──────────────────────────────────────────────────
// ADD NEW TAB HERE — add an entry to TAB_LABELS and add the matching
// TabId to the TabId type in src/types.ts
export const TAB_LABELS: Record<string, string> = {
  dashboard: "לוח בקרה",
  food: "מזון ודירות",
  equipment: "ציוד חשמלי",
  missions: "משימות",
  vehicles: "רכבים",
  workforce: "כוח אדם ומילואים",
  qualifications: "הכשרות",
  settings: "ניהול נתונים",
  apartmentSupplyControl: "בקרת אספקת דירות",
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
  deploymentTarget: "GitHub Pages + Google Apps Script + Google Sheets",
  gasDocsUrl:
    "https://developers.google.com/apps-script/guides/web",
  sheetsDocsUrl:
    "https://support.google.com/docs/answer/6000292",
};
