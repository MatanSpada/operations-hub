/**
 * src/utils.ts
 * ============
 * Shared utility functions used across all modules.
 *
 * ─── WHERE TO EDIT ────────────────────────────────────────────────────
 * • Add new formatting helpers here (not inside modules)
 * • ALERT RULES: date/status helpers live here
 * • Badge styling helpers live here
 * ─────────────────────────────────────────────────────────────────────
 */

import { BadgeVariant, VehicleTask } from "./types";
import { ALERT_THRESHOLDS } from "./config";

// ── Date Utilities ────────────────────────────────────────────────────

/** Format ISO date to Israeli locale (DD.MM.YYYY) */
export function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("he-IL");
}

/** Format ISO datetime to readable Hebrew string */
export function formatDateTime(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("he-IL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateForInput(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function startOfWeekIso(date = new Date()): string {
  const current = new Date(date);
  const day = current.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  current.setDate(current.getDate() + diff);
  current.setHours(0, 0, 0, 0);
  return formatDateForInput(current);
}

export function endOfWeekIso(date = new Date()): string {
  const current = new Date(startOfWeekIso(date));
  current.setDate(current.getDate() + 6);
  return formatDateForInput(current);
}

/** Return whole days remaining until endDate (negative = overdue) */
export function daysRemaining(endDateStr?: string): number | null {
  if (!endDateStr) return null;
  const end = new Date(endDateStr);
  if (isNaN(end.getTime())) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
}

/** Days since a past date */
export function daysSince(dateStr?: string): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / 86_400_000);
}

// ── Reserve Duty Helpers ──────────────────────────────────────────────
// ALERT RULES: reserve duty warning logic lives here

export type ReserveStatus =
  | "not_in_reserve"
  | "reserve_ending_soon"    // within ALERT_THRESHOLDS.reserveDutyWarningDays
  | "in_reserve"
  | "reserve_ended";

/** Compute the reserve duty status of an employee */
export function getReserveStatus(
  status: string,
  endDate?: string
): ReserveStatus {
  if (status !== "reserve") return "not_in_reserve";
  const days = daysRemaining(endDate);
  if (days === null) return "in_reserve";
  if (days < 0) return "reserve_ended";
  if (days <= ALERT_THRESHOLDS.reserveDutyWarningDays) return "reserve_ending_soon";
  return "in_reserve";
}

// ── Equipment Helpers ─────────────────────────────────────────────────

export function isEquipmentOverdue(expectedReturnDate?: string): boolean {
  if (!expectedReturnDate) return false;
  const days = daysRemaining(expectedReturnDate);
  if (days === null) return false;
  return days < 0;
}

export function calcAvailableQty(
  totalQty: number,
  ledger: { equipmentId: string; quantity: number; status: string }[],
  equipmentId: string
): number {
  const issued = ledger
    .filter((l) => l.equipmentId === equipmentId && l.status !== "returned")
    .reduce((sum, l) => sum + l.quantity, 0);
  return Math.max(0, totalQty - issued);
}

// ── Food Helpers ──────────────────────────────────────────────────────

export function calcWarehouseStock(
  transactions: { productId: string; type: string; quantity: number }[],
  productId: string
): number {
  return transactions
    .filter((t) => t.productId === productId)
    .reduce((sum, t) => sum + (t.type === "in" ? t.quantity : -t.quantity), 0);
}

export function formatQuantity(quantity: number): string {
  if (Number.isInteger(quantity)) return String(quantity);
  return quantity.toLocaleString("he-IL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function formatHours(hours?: number): string {
  if (hours === undefined || hours === null || Number.isNaN(hours)) return "—";
  return Number.isInteger(hours) ? String(hours) : hours.toLocaleString("he-IL", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function vehicleMissionTypeLabel(type?: VehicleTask["missionType"]): string {
  const map: Record<VehicleTask["missionType"], string> = {
    supply: "תספוק",
    fault: "תקלה",
    other: "אחר",
  };
  return map[type ?? "other"] ?? "אחר";
}

export function vehicleMissionTypeOptions(): Array<{
  value: VehicleTask["missionType"];
  label: string;
}> {
  return [
    { value: "supply", label: "תספוק" },
    { value: "fault", label: "תקלה" },
    { value: "other", label: "אחר" },
  ];
}

export function computeTaskWorkHours(task: Pick<VehicleTask, "departureTime" | "returnTime" | "workHours">): number | undefined {
  if (task.workHours !== undefined && Number.isFinite(task.workHours)) {
    return task.workHours;
  }
  if (!task.departureTime || !task.returnTime) return undefined;
  const start = new Date(task.departureTime);
  const end = new Date(task.returnTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return undefined;
  const diff = (end.getTime() - start.getTime()) / 3_600_000;
  if (diff <= 0) return undefined;
  return Number(diff.toFixed(2));
}

export function inDateRange(dateStr: string | undefined, from?: string, to?: string): boolean {
  if (!dateStr) return false;
  const date = dateStr.slice(0, 10);
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export function downloadCsv(filename: string, rows: string[][]): void {
  const csv = rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function isApartmentStale(lastSupplied?: string): boolean {
  if (!lastSupplied) return true;
  const days = daysSince(lastSupplied);
  return days !== null && days > ALERT_THRESHOLDS.apartmentStaleSupplyDays;
}

// ── Badge Variants ────────────────────────────────────────────────────
// ADD NEW STATUS BADGE COLORS HERE — return a BadgeVariant key

export function vehicleStatusVariant(
  status: string
): BadgeVariant {
  switch (status) {
    case "available": return "success";
    case "in_use": return "warning";
    case "maintenance": return "danger";
    default: return "neutral";
  }
}

export function vehicleStatusLabel(status: string): string {
  const map: Record<string, string> = {
    available: "פנוי",
    in_use: "בשימוש",
    maintenance: "תחזוקה",
  };
  return map[status] ?? status;
}

export function employeeStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "active": return "success";
    case "reserve": return "warning";
    case "inactive": return "neutral";
    default: return "neutral";
  }
}

export function employeeStatusLabel(status: string): string {
  const map: Record<string, string> = {
    active: "פעיל",
    reserve: "מילואים",
    inactive: "לא פעיל",
  };
  return map[status] ?? status;
}

export function equipmentStatusVariant(status: string): BadgeVariant {
  switch (status) {
    case "issued": return "warning";
    case "returned": return "success";
    case "overdue": return "danger";
    default: return "neutral";
  }
}

export function equipmentStatusLabel(status: string): string {
  const map: Record<string, string> = {
    issued: "מושאל",
    returned: "הוחזר",
    overdue: "באיחור",
  };
  return map[status] ?? status;
}

// ── Misc ──────────────────────────────────────────────────────────────

/** Simple pluralizer for Hebrew (just returns the number + label) */
export function countLabel(n: number, singular: string): string {
  return `${n} ${singular}`;
}

/** Truncate long text */
export function truncate(str: string, max = 30): string {
  return str.length > max ? str.slice(0, max) + "…" : str;
}
