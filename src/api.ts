/**
 * src/api.ts
 * ==========
 * API layer — all communication with Google Apps Script lives here.
 * The rest of the app should ONLY use these functions to fetch/post data.
 *
 * ─── WHERE TO EDIT ────────────────────────────────────────────────────
 * • To add a new API call → add a new async function below
 * • To change the GAS URL → update VITE_GAS_URL in .env.local / GitHub secrets
 * • All functions return typed promises so TypeScript catches mismatches
 * ─────────────────────────────────────────────────────────────────────
 */

import { GOOGLE_APPS_SCRIPT_URL, IS_GAS_CONFIGURED, USE_MOCK_DATA } from "./config";
import { InitialData, ApiResponse } from "./types";
import { MOCK_DATA } from "./mockData";
import { normalizeInitialData } from "./data/normalize";

export interface ApiActionResult<T> {
  data: T | null;
  error?: string;
}

async function parseApiJson<T>(
  response: Response,
  context: string
): Promise<ApiResponse<T>> {
  const rawText = await response.text();

  try {
    return JSON.parse(rawText) as ApiResponse<T>;
  } catch {
    const preview = rawText.trim().slice(0, 200);
    throw new Error(`${context} returned non-JSON response: ${preview || "<empty>"}`);
  }
}

// ── GET: fetch all initial data in one request ────────────────────────
// This single call loads everything so the UI feels instant.
// In the GAS backend, getInitialData() bundles all sheets.
export async function fetchInitialData(): Promise<InitialData | null> {
  if (USE_MOCK_DATA) {
    return normalizeInitialData(MOCK_DATA);
  }

  if (!IS_GAS_CONFIGURED) {
    console.error("[API] VITE_GAS_URL is not configured.");
    return null;
  }

  try {
    const response = await fetch(
      `${GOOGLE_APPS_SCRIPT_URL}?action=getInitialData`,
      { redirect: "follow" }
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const json = await parseApiJson<unknown>(response, "getInitialData");
    if (!json.success) throw new Error(json.error);
    return json.data ? normalizeInitialData(json.data) : null;
  } catch (err) {
    console.error("[API] fetchInitialData failed:", err);
    return null;
  }
}

export async function postActionDetailed<T = boolean>(
  action: string,
  payload: Record<string, unknown>
): Promise<ApiActionResult<T>> {
  if (USE_MOCK_DATA) {
    console.log(`[MOCK] postAction: ${action}`, payload);
    return { data: true as unknown as T };
  }

  if (!IS_GAS_CONFIGURED) {
    const error = `VITE_GAS_URL is not configured for ${action}`;
    console.error(`[API] ${error}`);
    return { data: null, error };
  }

  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload }),
      redirect: "follow",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const json = await parseApiJson<T>(response, action);
    if (!json.success) {
      return { data: null, error: json.error || `Action ${action} failed` };
    }

    return { data: json.data ?? (true as unknown as T) };
  } catch (err) {
    const error =
      err instanceof Error ? err.message : `Unknown error while calling ${action}`;
    console.error(`[API] postAction(${action}) failed:`, err);
    return { data: null, error };
  }
}

// ── POST: generic action sender ───────────────────────────────────────
// Usage: postAction("updateVehicleStatus", { plate: "123-45-678", status: "available" })
// ADD NEW POST ACTIONS HERE — add matching case in GAS doPost()
export async function postAction<T = boolean>(
  action: string,
  payload: Record<string, unknown>
): Promise<T | null> {
  const result = await postActionDetailed<T>(action, payload);
  return result.data;
}

// ── Convenience wrappers (add more as needed) ─────────────────────────

export const api = {
  // Vehicle actions
  checkoutVehicle: (data: {
    plate: string;
    driver: string;
    departureLocation: string;
    taskPurpose: string;
    missionType: "supply" | "fault" | "other";
    requesterName?: string;
    requestingDepartment?: string;
    departureTime: string;
  }) => postAction("checkoutVehicle", data),

  returnVehicleDetailed: (data: {
    plate: string;
    workHours?: number;
    treatmentSummary?: string;
    returnTime?: string;
  }) => postActionDetailed("returnVehicle", data),

  returnVehicle: (plate: string) =>
    postAction("returnVehicle", { plate }),

  updateVehicleStatus: (plate: string, status: string) =>
    postAction("updateVehicleStatus", { plate, status }),

  // Equipment actions
  issueEquipment: (data: {
    equipmentId: string;
    quantity: number;
    issuedTo: string;
    employeeId?: string;
    department: string;
    expectedReturnDate?: string;
  }) => postAction("issueEquipment", data),

  issueEquipmentDetailed: (data: {
    equipmentId: string;
    quantity: number;
    issuedTo: string;
    employeeId?: string;
    department: string;
    expectedReturnDate?: string;
  }) => postActionDetailed("issueEquipment", data),

  syncEmployeeEquipmentAssignmentsDetailed: (data: {
    issuedTo: string;
    employeeId?: string;
    department?: string;
    expectedReturnDate?: string;
    applyMetadataToExisting?: boolean;
    assignments: Array<{
      equipmentId: string;
      targetQuantity: number;
    }>;
  }) => postActionDetailed("syncEmployeeEquipmentAssignments", data),

  createEquipmentType: (data: {
    name: string;
    totalQuantity: number;
  }) => postAction<{ equipmentId: string }>("createEquipmentType", data),

  createEquipmentTypeDetailed: (data: {
    name: string;
    totalQuantity: number;
  }) => postActionDetailed<{ equipmentId: string }>("createEquipmentType", data),

  returnEquipment: (ledgerId: string) =>
    postAction("returnEquipment", { ledgerId }),

  setEquipmentStock: (equipmentId: string, quantity: number) =>
    postAction("setEquipmentStock", { equipmentId, quantity }),

  setEquipmentStockDetailed: (equipmentId: string, quantity: number) =>
    postActionDetailed("setEquipmentStock", { equipmentId, quantity }),

  // Food actions
  createFoodProduct: (data: {
    name: string;
    category: string;
    departmentId?: string;
    department?: string;
    initialQuantity?: number;
  }) => postAction<{ productId: string }>("createFoodProduct", data),

  createFoodProductDetailed: (data: {
    name: string;
    category: string;
    departmentId?: string;
    department?: string;
    initialQuantity?: number;
  }) => postActionDetailed<{ productId: string }>("createFoodProduct", data),

  deleteFoodProductDetailed: (productId: string) =>
    postActionDetailed("deleteFoodProduct", { productId }),

  addFoodShipment: (productId: string, quantity: number) =>
    postAction("addFoodShipment", { productId, quantity }),

  setFoodStock: (productId: string, quantity: number) =>
    postAction("setFoodStock", { productId, quantity }),

  setFoodStockDetailed: (productId: string, quantity: number) =>
    postActionDetailed("setFoodStock", { productId, quantity }),

  supplyApartment: (apartmentId: string, productId: string, quantity: number) =>
    postAction("supplyApartment", { apartmentId, productId, quantity }),

  supplyApartmentDetailed: (apartmentId: string, productId: string, quantity: number) =>
    postActionDetailed("supplyApartment", { apartmentId, productId, quantity }),

  createDepartmentDetailed: (name: string) =>
    postActionDetailed<{ departmentId: string }>("createDepartment", { name }),

  deleteDepartmentDetailed: (departmentId: string) =>
    postActionDetailed("deleteDepartment", { departmentId }),

  createQualificationDetailed: (name: string) =>
    postActionDetailed<{ qualificationId: string }>("createQualification", { name }),

  deleteQualificationDetailed: (qualificationId: string) =>
    postActionDetailed("deleteQualification", { qualificationId }),

  createDrivingLicenseDetailed: (name: string) =>
    postActionDetailed<{ licenseId: string }>("createDrivingLicense", { name }),

  deleteDrivingLicenseDetailed: (licenseId: string) =>
    postActionDetailed("deleteDrivingLicense", { licenseId }),

  createVehicleDetailed: (data: {
    plate: string;
    vehicleType?: string;
    notes?: string;
  }) => postActionDetailed<{ plate: string }>("createVehicle", data),

  createCampTaskDetailed: (data: {
    date: string;
    department?: string;
    requesterName: string;
    approvingCommander?: string;
    mission: string;
    treatmentSummary?: string;
  }) => postActionDetailed<{ taskId: string }>("createCampTask", data),

  updateCampTaskDetailed: (data: {
    taskId: string;
    date: string;
    department?: string;
    requesterName: string;
    approvingCommander?: string;
    mission: string;
    treatmentSummary?: string;
  }) => postActionDetailed("updateCampTask", data),

  deleteCampTaskDetailed: (taskId: string) =>
    postActionDetailed("deleteCampTask", { taskId }),

  deleteVehicleDetailed: (plate: string) =>
    postActionDetailed("deleteVehicle", { plate }),

  createEmployeeDetailed: (data: {
    name: string;
    departmentId: string;
    role?: string;
    phone?: string;
    qualificationIds?: string[];
    drivingLicenseIds?: string[];
  }) => postActionDetailed<{ employeeId: string }>("createEmployee", data),

  updateEmployeeDetailed: (data: {
    employeeId: string;
    name: string;
    departmentId: string;
    status: "active" | "reserve" | "inactive";
    reserveStartDate?: string;
    reserveEndDate?: string;
    role?: string;
    phone?: string;
    qualificationIds?: string[];
    drivingLicenseIds?: string[];
  }) => postActionDetailed("updateEmployee", data),

  deleteEmployeeDetailed: (employeeId: string) =>
    postActionDetailed("deleteEmployee", { employeeId }),

  // Workforce actions
  addReserveDuty: (data: {
    employeeId: string;
    startDate: string;
    endDate: string;
  }) => postAction("addReserveDuty", data),

  endReserveDuty: (employeeId: string) =>
    postAction("endReserveDuty", { employeeId }),

  // Qualification actions
  assignQualification: (employeeId: string, qualificationId: string) =>
    postAction("assignQualification", { employeeId, qualificationId }),

  removeQualification: (employeeId: string, qualificationId: string) =>
    postAction("removeQualification", { employeeId, qualificationId }),
};
