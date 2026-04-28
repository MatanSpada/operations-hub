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
import * as XLSX from "xlsx";

// ── Date Utilities ────────────────────────────────────────────────────

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function parseDateValue(dateStr?: string): Date | null {
  if (!dateStr) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [year, month, day] = dateStr.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toLocalDateKey(dateStr?: string): string | null {
  const date = parseDateValue(dateStr);
  if (!date) return null;
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Format ISO date to Israeli locale (DD/MM/YYYY) */
export function formatDate(dateStr?: string): string {
  const date = parseDateValue(dateStr);
  if (!date) return "—";
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

/** Format ISO date with a short year (DD/MM/YY) */
export function formatDateShort(dateStr?: string): string {
  const date = parseDateValue(dateStr);
  if (!date) return "—";
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${pad2(date.getFullYear() % 100)}`;
}

export function formatTime(dateStr?: string): string {
  const date = parseDateValue(dateStr);
  if (!date) return "—";
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

/** Format ISO datetime to readable Hebrew string in 24h */
export function formatDateTime(dateStr?: string): string {
  const date = parseDateValue(dateStr);
  if (!date) return "—";
  return `${formatDate(dateStr)} ${formatTime(dateStr)}`;
}

export function formatDateForInput(date = new Date()): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function formatTimeForInput(date = new Date()): string {
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function getDateTimeInputParts(dateStr?: string): { date: string; time: string } {
  const date = parseDateValue(dateStr);
  if (!date) {
    const now = new Date();
    return { date: formatDateForInput(now), time: formatTimeForInput(now) };
  }

  return {
    date: formatDateForInput(date),
    time: formatTimeForInput(date),
  };
}

export function combineDateAndTimeToIso(date: string, time: string): string | null {
  if (!date || !time) return null;
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  if (!year || !month || !day || Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return new Date(year, month - 1, day, hours, minutes, 0, 0).toISOString();
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
  const end = parseDateValue(endDateStr);
  if (!end) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
}

/** Days since a past date */
export function daysSince(dateStr?: string): number | null {
  const d = parseDateValue(dateStr);
  if (!d) return null;
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

export function computeDurationHours(startDateTime?: string, endDateTime?: string): number | undefined {
  if (!startDateTime || !endDateTime) return undefined;
  const start = parseDateValue(startDateTime);
  const end = parseDateValue(endDateTime);
  if (!start || !end) return undefined;
  const diff = (end.getTime() - start.getTime()) / 3_600_000;
  if (diff < 0) return undefined;
  return Number(diff.toFixed(2));
}

export function inDateRange(dateStr: string | undefined, from?: string, to?: string): boolean {
  const date = toLocalDateKey(dateStr);
  if (!date) return false;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

export interface ExportFile {
  filename: string;
  rows?: string[][];
  bytes?: Uint8Array;
}

export type ExportFormat = "excel" | "pdf";

export interface TabularExportDefinition {
  filenameBase: string;
  title: string;
  rows: string[][];
  worksheetName?: string;
}

function buildCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let index = 0; index < 256; index += 1) {
    let value = index;
    for (let bit = 0; bit < 8; bit += 1) {
      value = (value & 1) ? (0xedb88320 ^ (value >>> 1)) : (value >>> 1);
    }
    table[index] = value >>> 0;
  }
  return table;
}

const CRC32_TABLE = buildCrc32Table();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function withSerialColumn(rows: string[][], headerLabel = "מספר סידורי"): string[][] {
  if (rows.length === 0) return [[headerLabel]];
  const [header, ...dataRows] = rows;
  return [
    [headerLabel, ...header],
    ...dataRows.map((row, index) => [String(index + 1), ...row]),
  ];
}

export function rowsToCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
        .join(",")
    )
    .join("\n");
}

function encodeCsvRows(rows: string[][]): Uint8Array {
  return new TextEncoder().encode(`\uFEFF${rowsToCsv(withSerialColumn(rows))}`);
}

function normalizeExportFileBytes(file: ExportFile): Uint8Array {
  if (file.bytes) return file.bytes;
  if (file.rows) return encodeCsvRows(file.rows);
  throw new Error(`Missing rows or bytes for export file: ${file.filename}`);
}

function replaceFilenameExtension(filenameBase: string, extension: string): string {
  const sanitizedExtension = extension.replace(/^\./, "");
  if (filenameBase.includes(".")) {
    return filenameBase.replace(/\.[^.]+$/, `.${sanitizedExtension}`);
  }
  return `${filenameBase}.${sanitizedExtension}`;
}

function sanitizeWorksheetName(name: string): string {
  const sanitized = name.replace(/[\\/?*:[\]]/g, " ").trim();
  return (sanitized || "Export").slice(0, 31);
}

function estimateColumnWidths(rows: string[][]): Array<{ wch: number }> {
  const normalizedRows = withSerialColumn(rows);
  const columnCount = normalizedRows[0]?.length ?? 0;

  return Array.from({ length: columnCount }, (_, columnIndex) => {
    const maxLength = normalizedRows.reduce((longest, row) => {
      const valueLength = String(row[columnIndex] ?? "").length;
      return Math.max(longest, valueLength);
    }, 0);

    return { wch: Math.min(40, Math.max(10, maxLength + 2)) };
  });
}

function createExcelBytes(rows: string[][], worksheetName: string): Uint8Array {
  const worksheet = XLSX.utils.aoa_to_sheet(withSerialColumn(rows));
  worksheet["!cols"] = estimateColumnWidths(rows);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeWorksheetName(worksheetName));
  workbook.Workbook = {
    ...(workbook.Workbook ?? {}),
    Views: [{ RTL: true }],
  };

  const workbookBytes = XLSX.write(workbook, {
    bookType: "xlsx",
    type: "array",
  });

  return new Uint8Array(workbookBytes);
}

async function createPdfBlob(rows: string[][], title: string): Promise<Blob> {
  if (typeof document === "undefined") {
    throw new Error("PDF export requires a browser environment");
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import("html2canvas"),
    import("jspdf"),
  ]);

  const exportedRows = withSerialColumn(rows);
  const landscape = exportedRows[0]?.length > 5;
  const container = document.createElement("div");
  const pageWidthPx = landscape ? 1122 : 794;

  container.dir = "rtl";
  container.lang = "he";
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "-20000px";
  container.style.width = `${pageWidthPx}px`;
  container.style.background = "#ffffff";
  container.style.color = "#111827";
  container.style.padding = "32px";
  container.style.boxSizing = "border-box";
  container.style.fontFamily = "Arial, 'Noto Sans Hebrew', sans-serif";

  const titleElement = document.createElement("div");
  titleElement.textContent = title;
  titleElement.style.fontSize = "28px";
  titleElement.style.fontWeight = "700";
  titleElement.style.marginBottom = "20px";
  titleElement.style.textAlign = "right";

  const subtitleElement = document.createElement("div");
  subtitleElement.textContent = `סה״כ שורות: ${Math.max(0, exportedRows.length - 1)}`;
  subtitleElement.style.fontSize = "14px";
  subtitleElement.style.color = "#4b5563";
  subtitleElement.style.marginBottom = "18px";
  subtitleElement.style.textAlign = "right";

  const table = document.createElement("table");
  table.dir = "rtl";
  table.style.width = "100%";
  table.style.borderCollapse = "collapse";
  table.style.tableLayout = "fixed";
  table.style.fontSize = "14px";

  exportedRows.forEach((row, rowIndex) => {
    const rowElement = document.createElement("tr");

    row.forEach((cellValue) => {
      const cell = document.createElement(rowIndex === 0 ? "th" : "td");
      cell.textContent = String(cellValue ?? "");
      cell.dir = "rtl";
      cell.style.border = "1px solid #d1d5db";
      cell.style.padding = "10px 12px";
      cell.style.textAlign = "right";
      cell.style.verticalAlign = "top";
      cell.style.wordBreak = "break-word";
      cell.style.whiteSpace = "pre-wrap";
      cell.style.unicodeBidi = "plaintext";

      if (rowIndex === 0) {
        cell.style.background = "#f3f4f6";
        cell.style.fontWeight = "700";
      }

      rowElement.appendChild(cell);
    });

    table.appendChild(rowElement);
  });

  container.appendChild(titleElement);
  container.appendChild(subtitleElement);
  container.appendChild(table);
  document.body.appendChild(container);

  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });

  const canvas = await html2canvas(container, {
    backgroundColor: "#ffffff",
    scale: 2,
    useCORS: true,
    logging: false,
  });

  document.body.removeChild(container);

  const pdf = new jsPDF({
    orientation: landscape ? "landscape" : "portrait",
    unit: "pt",
    format: "a4",
    compress: true,
  });
  const margin = 18;
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imageWidth = pageWidth - margin * 2;
  const pxPerPt = canvas.width / imageWidth;
  const pageContentHeightPx = Math.floor((pageHeight - margin * 2) * pxPerPt);

  let offsetY = 0;
  let pageIndex = 0;

  while (offsetY < canvas.height) {
    const sliceHeight = Math.min(pageContentHeightPx, canvas.height - offsetY);
    const pageCanvas = document.createElement("canvas");
    pageCanvas.width = canvas.width;
    pageCanvas.height = sliceHeight;

    const pageContext = pageCanvas.getContext("2d");
    if (!pageContext) {
      throw new Error("Failed to create PDF rendering context");
    }

    pageContext.fillStyle = "#ffffff";
    pageContext.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
    pageContext.drawImage(
      canvas,
      0,
      offsetY,
      canvas.width,
      sliceHeight,
      0,
      0,
      canvas.width,
      sliceHeight
    );

    if (pageIndex > 0) {
      pdf.addPage();
    }

    const renderedHeight = sliceHeight / pxPerPt;
    pdf.addImage(
      pageCanvas.toDataURL("image/png"),
      "PNG",
      margin,
      margin,
      imageWidth,
      renderedHeight,
      undefined,
      "FAST"
    );

    offsetY += sliceHeight;
    pageIndex += 1;
  }

  return pdf.output("blob");
}

function dosDateTime(date = new Date()): { dosTime: number; dosDate: number } {
  const year = Math.max(1980, date.getFullYear());
  const dosTime =
    (date.getHours() << 11) |
    (date.getMinutes() << 5) |
    Math.floor(date.getSeconds() / 2);
  const dosDate =
    ((year - 1980) << 9) |
    ((date.getMonth() + 1) << 5) |
    date.getDate();
  return { dosTime, dosDate };
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value >>> 0, true);
}

function concatUint8Arrays(parts: Uint8Array[]): Uint8Array {
  const totalSize = parts.reduce((sum, part) => sum + part.length, 0);
  const output = new Uint8Array(totalSize);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

export function buildZipBlob(files: ExportFile[]): Blob {
  const now = dosDateTime();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  files.forEach((file) => {
    const filenameBytes = new TextEncoder().encode(file.filename);
    const fileBytes = normalizeExportFileBytes(file);
    const checksum = crc32(fileBytes);

    const localHeader = new Uint8Array(30 + filenameBytes.length);
    const localView = new DataView(localHeader.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0x0800);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, now.dosTime);
    writeUint16(localView, 12, now.dosDate);
    writeUint32(localView, 14, checksum);
    writeUint32(localView, 18, fileBytes.length);
    writeUint32(localView, 22, fileBytes.length);
    writeUint16(localView, 26, filenameBytes.length);
    writeUint16(localView, 28, 0);
    localHeader.set(filenameBytes, 30);

    const centralHeader = new Uint8Array(46 + filenameBytes.length);
    const centralView = new DataView(centralHeader.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0x0800);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, now.dosTime);
    writeUint16(centralView, 14, now.dosDate);
    writeUint32(centralView, 16, checksum);
    writeUint32(centralView, 20, fileBytes.length);
    writeUint32(centralView, 24, fileBytes.length);
    writeUint16(centralView, 28, filenameBytes.length);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, offset);
    centralHeader.set(filenameBytes, 46);

    localParts.push(localHeader, fileBytes);
    centralParts.push(centralHeader);
    offset += localHeader.length + fileBytes.length;
  });

  const centralDirectory = concatUint8Arrays(centralParts);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, files.length);
  writeUint16(endView, 10, files.length);
  writeUint32(endView, 12, centralDirectory.length);
  writeUint32(endView, 16, offset);
  writeUint16(endView, 20, 0);

  const archiveBytes = concatUint8Arrays([...localParts, centralDirectory, endRecord]);
  return new Blob(
    [archiveBytes.buffer.slice(archiveBytes.byteOffset, archiveBytes.byteOffset + archiveBytes.byteLength)],
    { type: "application/zip" }
  );
}

export function downloadCsv(filename: string, rows: string[][]): void {
  downloadBlob(filename, new Blob([`\uFEFF${rowsToCsv(withSerialColumn(rows))}`], {
    type: "text/csv;charset=utf-8;",
  }));
}

export function downloadZip(filename: string, files: ExportFile[]): void {
  downloadBlob(filename, buildZipBlob(files));
}

export async function buildExportFile(
  definition: TabularExportDefinition,
  format: ExportFormat
): Promise<ExportFile> {
  if (format === "excel") {
    return {
      filename: replaceFilenameExtension(definition.filenameBase, "xlsx"),
      bytes: createExcelBytes(definition.rows, definition.worksheetName ?? definition.title),
    };
  }

  const blob = await createPdfBlob(definition.rows, definition.title);
  return {
    filename: replaceFilenameExtension(definition.filenameBase, "pdf"),
    bytes: new Uint8Array(await blob.arrayBuffer()),
  };
}

export function downloadGeneratedFile(file: ExportFile): void {
  const extension = file.filename.split(".").pop()?.toLowerCase();
  const type =
    extension === "xlsx"
      ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      : extension === "pdf"
        ? "application/pdf"
        : "application/octet-stream";

  downloadBlob(file.filename, new Blob([normalizeExportFileBytes(file)], { type }));
}

export async function downloadTableExport(
  definition: TabularExportDefinition,
  format: ExportFormat
): Promise<void> {
  const file = await buildExportFile(definition, format);
  downloadGeneratedFile(file);
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
