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
    const json: ApiResponse<unknown> = await response.json();
    if (!json.success) throw new Error(json.error);
    return json.data ? normalizeInitialData(json.data) : null;
  } catch (err) {
    console.error("[API] fetchInitialData failed:", err);
    return null;
  }
}

// ── POST: generic action sender ───────────────────────────────────────
// Usage: postAction("updateVehicleStatus", { plate: "123-45-678", status: "available" })
// ADD NEW POST ACTIONS HERE — add matching case in GAS doPost()
export async function postAction<T = boolean>(
  action: string,
  payload: Record<string, unknown>
): Promise<T | null> {
  if (USE_MOCK_DATA) {
    console.log(`[MOCK] postAction: ${action}`, payload);
    return true as unknown as T;
  }

  if (!IS_GAS_CONFIGURED) {
    console.error(`[API] postAction(${action}) skipped because VITE_GAS_URL is not configured.`);
    return null;
  }

  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      // text/plain avoids CORS preflight issues with Google Apps Script
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ action, ...payload }),
      redirect: "follow",
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const json: ApiResponse<T> = await response.json();
    if (!json.success) throw new Error(json.error);
    return json.data ?? (true as unknown as T);
  } catch (err) {
    console.error(`[API] postAction(${action}) failed:`, err);
    return null;
  }
}

// ── Convenience wrappers (add more as needed) ─────────────────────────

export const api = {
  // Vehicle actions
  checkoutVehicle: (data: {
    plate: string;
    driver: string;
    origin: string;
    destination: string;
    departureTime: string;
  }) => postAction("checkoutVehicle", data),

  returnVehicle: (plate: string) =>
    postAction("returnVehicle", { plate }),

  updateVehicleStatus: (plate: string, status: string) =>
    postAction("updateVehicleStatus", { plate, status }),

  // Equipment actions
  issueEquipment: (data: {
    equipmentId: string;
    quantity: number;
    issuedTo: string;
    department: string;
    expectedReturnDate?: string;
  }) => postAction("issueEquipment", data),

  returnEquipment: (ledgerId: string) =>
    postAction("returnEquipment", { ledgerId }),

  // Food actions
  addFoodShipment: (productId: string, quantity: number) =>
    postAction("addFoodShipment", { productId, quantity }),

  supplyApartment: (apartmentId: string, productId: string, quantity: number) =>
    postAction("supplyApartment", { apartmentId, productId, quantity }),

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
