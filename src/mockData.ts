/**
 * src/mockData.ts
 * ===============
 * Mock data used during development when Google Apps Script is not connected.
 * 
 * ─── WHERE TO EDIT ────────────────────────────────────────────────────
 * • Update this data to test different scenarios
 * • When connected to real GAS, this file is ignored
 * • Add new mock entries when you add new modules
 * ─────────────────────────────────────────────────────────────────────
 */

import { InitialData } from "./types";

export const MOCK_DATA: InitialData = {
  // ── Departments ──────────────────────────────────────────────────
  departments: [
    { id: "d1", name: "תפעול" },
    { id: "d2", name: "לוגיסטיקה" },
    { id: "d3", name: "אחזקה" },
    { id: "d4", name: "משאבי אנוש" },
    { id: "d5", name: "ביטחון" },
  ],

  // ── Employees ────────────────────────────────────────────────────
  employees: [
    { id: "e1", name: "יוסי כהן", department: "תפעול", status: "active", role: "מנהל צוות" },
    { id: "e2", name: "רחל לוי", department: "לוגיסטיקה", status: "reserve", reserveStartDate: "2025-03-01", reserveEndDate: "2025-03-20", role: "רכזת" },
    { id: "e3", name: "דוד מזרחי", department: "אחזקה", status: "reserve", reserveStartDate: "2025-02-15", reserveEndDate: "2025-03-18", role: "טכנאי" },
    { id: "e4", name: "מיכל אברהם", department: "תפעול", status: "active", role: "מתאמת" },
    { id: "e5", name: "שלמה גרין", department: "ביטחון", status: "active", role: "קצין ביטחון" },
    { id: "e6", name: "נועה שפירא", department: "לוגיסטיקה", status: "reserve", reserveStartDate: "2025-03-05", reserveEndDate: "2025-03-19", role: "מנהלת" },
    { id: "e7", name: "אמיר בן דוד", department: "אחזקה", status: "active", role: "מנהיג עבודה" },
    { id: "e8", name: "לילי ישראל", department: "משאבי אנוש", status: "active", role: "מנהלת כ\"א" },
    { id: "e9", name: "גיל פרידמן", department: "תפעול", status: "active", role: "עובד" },
    { id: "e10", name: "טל שמש", department: "ביטחון", status: "reserve", reserveStartDate: "2025-02-20", reserveEndDate: "2025-03-15", role: "שומר" },
  ],

  // ── Vehicles ─────────────────────────────────────────────────────
  vehicles: [
    { plate: "123-45-678", status: "available" },
    { plate: "987-65-432", status: "in_use", currentDriver: "יוסי כהן", origin: "בסיס", destination: "מחסן מרכזי", departureTime: "2025-03-11T08:30" },
    { plate: "456-78-901", status: "in_use", currentDriver: "דוד מזרחי", origin: "מחסן מרכזי", destination: "אתר צפון", departureTime: "2025-03-11T07:00" },
    { plate: "234-56-789", status: "maintenance", notes: "טיפול שוטף - מוסך" },
    { plate: "345-67-890", status: "available" },
  ],

  // ── Equipment Types ───────────────────────────────────────────────
  equipmentTypes: [
    { id: "eq1", name: "מקדחה", totalQuantity: 8 },
    { id: "eq2", name: "גנרטור", totalQuantity: 3 },
    { id: "eq3", name: "מזגן ניידי", totalQuantity: 5 },
    { id: "eq4", name: "מדחס אוויר", totalQuantity: 4 },
    { id: "eq5", name: "משאבת מים", totalQuantity: 2 },
  ],

  // ── Equipment Ledger ──────────────────────────────────────────────
  equipmentLedger: [
    { id: "l1", equipmentId: "eq1", equipmentName: "מקדחה", quantity: 3, issuedTo: "יוסי כהן", department: "תפעול", issueDate: "2025-03-01", expectedReturnDate: "2025-03-10", status: "overdue" },
    { id: "l2", equipmentId: "eq2", equipmentName: "גנרטור", quantity: 1, issuedTo: "דוד מזרחי", department: "אחזקה", issueDate: "2025-03-05", expectedReturnDate: "2025-03-20", status: "issued" },
    { id: "l3", equipmentId: "eq3", equipmentName: "מזגן ניידי", quantity: 2, issuedTo: "אמיר בן דוד", department: "אחזקה", issueDate: "2025-02-20", expectedReturnDate: "2025-02-28", status: "overdue" },
    { id: "l4", equipmentId: "eq1", equipmentName: "מקדחה", quantity: 2, issuedTo: "שלמה גרין", department: "ביטחון", issueDate: "2025-03-08", expectedReturnDate: "2025-03-15", status: "issued" },
    { id: "l5", equipmentId: "eq4", equipmentName: "מדחס אוויר", quantity: 1, issuedTo: "גיל פרידמן", department: "תפעול", issueDate: "2025-03-10", status: "issued" },
    { id: "l6", equipmentId: "eq2", equipmentName: "גנרטור", quantity: 1, issuedTo: "יוסי כהן", department: "תפעול", issueDate: "2025-02-10", returnDate: "2025-02-20", status: "returned" },
  ],

  // ── Food Products ─────────────────────────────────────────────────
  foodProducts: [
    { id: "f1", name: "ארגז עגבניות", category: "ירקות" },
    { id: "f2", name: "ארגז גבינות", category: "מוצרי חלב" },
    { id: "f3", name: "שקי אורז", category: "קטניות ודגנים" },
    { id: "f4", name: "שקי קמח", category: "קטניות ודגנים" },
    { id: "f5", name: "ארגז שמנים", category: "שמנים" },
    { id: "f6", name: "ארגז ביצים", category: "פרוטאין" },
  ],

  // ── Food Transactions ─────────────────────────────────────────────
  foodTransactions: [
    { id: "ft1", date: "2025-03-09", type: "in", productId: "f1", productName: "ארגז עגבניות", quantity: 20 },
    { id: "ft2", date: "2025-03-09", type: "in", productId: "f2", productName: "ארגז גבינות", quantity: 15 },
    { id: "ft3", date: "2025-03-09", type: "in", productId: "f3", productName: "שקי אורז", quantity: 10 },
    { id: "ft4", date: "2025-03-09", type: "in", productId: "f4", productName: "שקי קמח", quantity: 8 },
    { id: "ft5", date: "2025-03-09", type: "in", productId: "f5", productName: "ארגז שמנים", quantity: 6 },
    { id: "ft6", date: "2025-03-09", type: "in", productId: "f6", productName: "ארגז ביצים", quantity: 12 },
    { id: "ft7", date: "2025-03-10", type: "out", productId: "f1", productName: "ארגז עגבניות", quantity: 5, destination: "דירה א'" },
    { id: "ft8", date: "2025-03-10", type: "out", productId: "f2", productName: "ארגז גבינות", quantity: 4, destination: "דירה א'" },
    { id: "ft9", date: "2025-03-10", type: "out", productId: "f1", productName: "ארגז עגבניות", quantity: 4, destination: "דירה ב'" },
    { id: "ft10", date: "2025-03-10", type: "out", productId: "f3", productName: "שקי אורז", quantity: 3, destination: "דירה ב'" },
    { id: "ft11", date: "2025-03-10", type: "out", productId: "f5", productName: "ארגז שמנים", quantity: 1, destination: "דירה ג'" },
    { id: "ft12", date: "2025-03-03", type: "out", productId: "f6", productName: "ארגז ביצים", quantity: 2, destination: "דירה ד'" },
  ],

  // ── Apartments ────────────────────────────────────────────────────
  apartments: [
    { id: "a1", name: "דירה א'", lastSupplied: "2025-03-10" },
    { id: "a2", name: "דירה ב'", lastSupplied: "2025-03-10" },
    { id: "a3", name: "דירה ג'", lastSupplied: "2025-03-10" },
    { id: "a4", name: "דירה ד'", lastSupplied: "2025-03-03" },
    { id: "a5", name: "דירה ה'", lastSupplied: undefined },
  ],

  // ── Qualifications ────────────────────────────────────────────────
  qualifications: [
    { id: "q1", name: "הכרת הרכב" },
    { id: "q2", name: "רישיון ב'" },
    { id: "q3", name: "רישיון ג'" },
    { id: "q4", name: "עזרה ראשונה" },
    { id: "q5", name: "עבודה בגובה" },
    { id: "q6", name: "הפעלת מנוף" },
  ],

  // ── Employee Qualifications ───────────────────────────────────────
  employeeQualifications: [
    { employeeId: "e1", qualificationId: "q1" },
    { employeeId: "e1", qualificationId: "q2" },
    { employeeId: "e1", qualificationId: "q4" },
    { employeeId: "e2", qualificationId: "q2" },
    { employeeId: "e2", qualificationId: "q3" },
    { employeeId: "e3", qualificationId: "q1" },
    { employeeId: "e3", qualificationId: "q5" },
    { employeeId: "e3", qualificationId: "q6" },
    { employeeId: "e4", qualificationId: "q1" },
    { employeeId: "e4", qualificationId: "q4" },
    { employeeId: "e5", qualificationId: "q1" },
    { employeeId: "e5", qualificationId: "q2" },
    { employeeId: "e5", qualificationId: "q4" },
    { employeeId: "e6", qualificationId: "q2" },
    { employeeId: "e7", qualificationId: "q5" },
    { employeeId: "e7", qualificationId: "q6" },
    { employeeId: "e8", qualificationId: "q4" },
    { employeeId: "e9", qualificationId: "q1" },
    { employeeId: "e10", qualificationId: "q1" },
    { employeeId: "e10", qualificationId: "q2" },
  ],
};
