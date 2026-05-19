/**
 * src/types.ts
 * ============
 * TypeScript type definitions for all data models.
 *
 * ─── WHERE TO EDIT ────────────────────────────────────────────────────
 * • To add a new field to Employees → add it here AND update:
 *     1. Google Sheet column
 *     2. src/api.ts fetchEmployees()
 *     3. The UI table in modules/workforce/
 * • To add a new module → add its types here and a new TabId value
 * ─────────────────────────────────────────────────────────────────────
 */

// ── Navigation ───────────────────────────────────────────────────────
// ADD NEW TAB HERE — add the string literal to TabId
export type TabId =
  | "dashboard"
  | "food"
  | "equipment"
  | "missions"
  | "vehicles"
  | "workforce"
  | "qualifications"
  | "settings"
  | "apartmentSupplyControl";

// ── Employees ────────────────────────────────────────────────────────
// UPDATE SHEET COLUMN MAP HERE — matches Employees sheet columns
export interface Employee {
  id: string;
  name: string;
  department: string;
  status: "active" | "reserve" | "inactive"; // ADD NEW STATUS VALUES HERE
  reserveStartDate?: string;  // ISO date string YYYY-MM-DD
  reserveEndDate?: string;    // ISO date string YYYY-MM-DD
  phone?: string;             // ADD NEW EMPLOYEE FIELDS HERE
  role?: string;
}

// ── Departments ──────────────────────────────────────────────────────
export interface Department {
  id: string;
  name: string;
}

export interface DrivingLicense {
  id: string;
  name: string;
}

// ── Vehicles ─────────────────────────────────────────────────────────
// UPDATE SHEET COLUMN MAP HERE — matches Vehicles sheet columns
export interface Vehicle {
  plate: string;
  vehicleType?: string;
  status: "available" | "in_use" | "maintenance"; // ADD NEW VEHICLE STATUSES HERE
  currentDriver?: string;
  departureLocation?: string;
  taskPurpose?: string;
  missionType?: "supply" | "fault" | "other";
  requesterName?: string;
  requestingDepartment?: string;
  departureTime?: string;
  notes?: string;             // ADD NEW VEHICLE FIELDS HERE
}

export interface VehicleTask {
  id: string;
  plate: string;
  vehicleType?: string;
  driver: string;
  departureLocation: string;
  taskPurpose: string;
  missionType: "supply" | "fault" | "other";
  requesterName?: string;
  requestingDepartment?: string;
  departureTime: string;
  returnTime?: string;
  workHours?: number;
  treatmentSummary?: string;
}

export interface CampTask {
  id: string;
  date: string;
  department?: string;
  requesterName: string;
  approvingCommander?: string;
  mission: string;
  treatmentSummary?: string;
}

// ── Equipment ────────────────────────────────────────────────────────
// UPDATE SHEET COLUMN MAP HERE — matches Equipment_Catalog sheet columns
export interface EquipmentType {
  id: string;
  name: string;
  totalQuantity: number;
}

export interface EquipmentLedgerEntry {
  id: string;
  equipmentId: string;
  equipmentName: string;
  quantity: number;
  issuedTo: string;
  employeeId?: string;
  department: string;
  issueDate: string;          // ISO date string
  expectedReturnDate?: string;
  returnDate?: string;
  status: "issued" | "returned" | "overdue"; // ADD NEW EQUIPMENT STATUSES HERE
}

// ── Food ─────────────────────────────────────────────────────────────
// UPDATE SHEET COLUMN MAP HERE — matches Food_Catalog sheet columns
export interface FoodProduct {
  id: string;
  name: string;
  category: string;           // ADD NEW FOOD CATEGORIES HERE
  department?: string;
}

export interface FoodTransaction {
  id: string;
  date: string;               // ISO date string
  type: "in" | "out";         // in = warehouse receipt, out = apartment delivery
  productId: string;
  productName: string;
  quantity: number;
  destinationApartmentId?: string;
  destination?: string;       // apartment name (for "out" type)
}

export interface FoodStock {
  productId: string;
  productName: string;
  category: string;
  warehouseQty: number;
  unit: string;
}

// ── Apartments ───────────────────────────────────────────────────────
export interface Apartment {
  id: string;
  name: string;
  lastSupplied?: string;      // ISO date string
}

// ── Qualifications ───────────────────────────────────────────────────
export interface Qualification {
  id: string;
  name: string;
}

export interface EmployeeQualification {
  employeeId: string;
  qualificationId: string;
}

export interface EmployeeDrivingLicense {
  employeeId: string;
  drivingLicenseId: string;
}

// ── Apartment Supply Control ────────────────────────────────────────
export type SupplyRequiredType = "exists" | "quantity" | "text";

export type SupplyReportedStatus = "ok" | "missing" | "partial" | "not_relevant";

export type SupplyOverallStatus = "ok" | "partial" | "missing" | "issue";

export type SupplyPhotoCategory = "מקרר" | "ציוד ניקוי אקסטרה" | "מצעים" | "חריגים";

export interface SupplyApartment {
  apartment_id: string;
  location: string;
  mission: string;
  type: string;
  notes?: string;
  report_token?: string;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface SupplyApartmentInput {
  apartment_id?: string;
  location: string;
  mission: string;
  type: string;
  notes?: string;
  report_token?: string;
  active?: boolean;
}

export interface SupplyStandardItem {
  standard_item_id: string;
  apartment_id: string;
  category: string;
  item_name: string;
  required_value?: string;
  required_type: SupplyRequiredType;
  photo_required: boolean;
  active: boolean;
  notes?: string;
}

export interface SupplyStandardItemInput {
  standard_item_id?: string;
  apartment_id: string;
  category: string;
  item_name: string;
  required_value?: string;
  required_type: SupplyRequiredType;
  photo_required: boolean;
  notes?: string;
  active?: boolean;
}

export interface SupplyReport {
  report_id: string;
  apartment_id: string;
  reporter_initials?: string;
  reported_at: string;
  general_notes?: string;
  overall_status?: SupplyOverallStatus;
}

export interface SupplyReportItem {
  report_item_id: string;
  report_id: string;
  standard_item_id?: string;
  category?: string;
  item_name: string;
  required_value?: string;
  reported_status: SupplyReportedStatus;
  actual_value?: string;
  item_notes?: string;
}

export interface SupplyReportPhoto {
  photo_id: string;
  report_id: string;
  apartment_id: string;
  category: SupplyPhotoCategory;
  drive_file_id?: string;
  drive_url?: string;
  uploaded_at?: string;
  notes?: string;
}

export interface SupplyReportsQueryOptions {
  limit?: number;
  page?: number;
}

export interface SupplyReportsByApartmentResult {
  reports: SupplyReport[];
  total: number;
  page: number;
  limit: number;
}

export interface SupplyReportDetails {
  report: SupplyReport;
  apartment: SupplyApartment;
  items: SupplyReportItem[];
  photos: SupplyReportPhoto[];
}

export interface SupplyReportingContextParams {
  apartmentId?: string;
  reportToken?: string;
}

export interface SupplyReportingContext {
  apartment: SupplyApartment;
  standardItems: SupplyStandardItem[];
}

export interface SupplyReportItemInput {
  standard_item_id: string;
  item_name: string;
  required_value?: string;
  reported_status: SupplyReportedStatus;
  actual_value?: string;
  item_notes?: string;
}

export interface SupplyCreateReportInput {
  apartment_id: string;
  reporter_initials: string;
  general_notes?: string;
  items: SupplyReportItemInput[];
}

export interface SupplyUpdateReportInput extends SupplyCreateReportInput {
  report_id: string;
}

export interface SupplyCreateReportResult {
  report: SupplyReport;
  items_count: number;
}

// ── API Response ─────────────────────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface InitialData {
  employees: Employee[];
  departments: Department[];
  drivingLicenses: DrivingLicense[];
  employeeDrivingLicenses: EmployeeDrivingLicense[];
  vehicles: Vehicle[];
  vehicleTasks: VehicleTask[];
  campTasks: CampTask[];
  equipmentTypes: EquipmentType[];
  equipmentLedger: EquipmentLedgerEntry[];
  foodProducts: FoodProduct[];
  foodTransactions: FoodTransaction[];
  apartments: Apartment[];
  qualifications: Qualification[];
  employeeQualifications: EmployeeQualification[];
}

// ── UI Helpers ───────────────────────────────────────────────────────
export type BadgeVariant = "success" | "warning" | "danger" | "info" | "neutral";

export interface SummaryCard {
  label: string;
  value: string | number;
  sub?: string;
  variant?: BadgeVariant;
  icon?: string;
}
