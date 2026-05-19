import {
  SupplyApartment,
  SupplyCreateReportResult,
  SupplyPhotoCategory,
  SupplyReportingContext,
  SupplyReport,
  SupplyReportDetails,
  SupplyReportItem,
  SupplyReportPhoto,
  SupplyOverallStatus,
  SupplyReportedStatus,
  SupplyReportsByApartmentResult,
  SupplyReportsQueryOptions,
  SupplyRequiredType,
  SupplyStandardItem,
} from "@/types";

type RawRow = Record<string, unknown>;

type RawReportDetailsPayload = {
  report: unknown;
  apartment: unknown;
  items: unknown;
  photos: unknown;
};

type RawReportingContextPayload = {
  apartment: unknown;
  standardItems?: unknown;
  standard_items?: unknown;
};

type RawCreateReportPayload = {
  report: unknown;
  items_count?: unknown;
};

const DEFAULT_REPORT_LIMIT = 30;

function asRows(value: unknown): RawRow[] {
  return Array.isArray(value) ? value.filter((item): item is RawRow => !!item && typeof item === "object") : [];
}

function asRow(value: unknown): RawRow | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as RawRow) : null;
}

function readValue(row: RawRow, keys: string[]): unknown {
  for (const key of keys) {
    if (key in row) return row[key];
  }
  return undefined;
}

function readString(row: RawRow, keys: string[], fallback = ""): string {
  const value = readValue(row, keys);
  if (value === null || value === undefined) return fallback;
  return String(value).trim();
}

function readOptionalString(row: RawRow, keys: string[]): string | undefined {
  const value = readString(row, keys);
  return value ? value : undefined;
}

function normalizeRequiredType(value: unknown): SupplyRequiredType {
  return value === "quantity" || value === "text" ? value : "exists";
}

function normalizeReportedStatus(value: unknown): SupplyReportedStatus {
  return value === "ok" || value === "missing" || value === "partial" || value === "not_relevant"
    ? value
    : "not_relevant";
}

function normalizeOverallStatus(value: unknown): SupplyOverallStatus {
  return value === "missing" || value === "partial" || value === "issue" ? value : "ok";
}

function normalizePhotoCategory(value: unknown): SupplyPhotoCategory {
  return value === "מקרר" || value === "ציוד ניקוי אקסטרה" || value === "מצעים" || value === "חריגים"
    ? value
    : "חריגים";
}

function normalizeLimit(value?: number): number {
  if (!value || !Number.isFinite(value)) return DEFAULT_REPORT_LIMIT;
  return Math.max(1, Math.floor(value));
}

function normalizePage(value?: number): number {
  if (!value || !Number.isFinite(value)) return 1;
  return Math.max(1, Math.floor(value));
}

function toTimestamp(value: string | undefined): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function mapSheetRowsByHeaders(rows: unknown[][]): RawRow[] {
  if (!Array.isArray(rows) || rows.length <= 1) return [];

  const headers = Array.isArray(rows[0]) ? rows[0].map((header) => String(header ?? "").trim()) : [];
  return rows.slice(1).map((row) => {
    const cells = Array.isArray(row) ? row : [];
    return headers.reduce<RawRow>((result, header, index) => {
      result[header] = cells[index];
      return result;
    }, {});
  });
}

export function isSupplyRowActive(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }
  return false;
}

export function normalizeSupplyApartment(row: RawRow): SupplyApartment {
  return {
    apartment_id: readString(row, ["apartment_id", "ApartmentID", "ApartmentId"]),
    location: readString(row, ["location", "Location"]),
    mission: readString(row, ["mission", "Mission"]),
    type: readString(row, ["type", "Type"]),
    notes: readOptionalString(row, ["notes", "Notes"]),
    report_token: readOptionalString(row, ["report_token", "ReportToken"]),
    active: isSupplyRowActive(readValue(row, ["active", "Active"])),
    created_at: readOptionalString(row, ["created_at", "CreatedAt"]),
    updated_at: readOptionalString(row, ["updated_at", "UpdatedAt"]),
  };
}

export function normalizeSupplyStandardItem(row: RawRow): SupplyStandardItem {
  return {
    standard_item_id: readString(row, ["standard_item_id", "StandardItemID", "StandardItemId"]),
    apartment_id: readString(row, ["apartment_id", "ApartmentID", "ApartmentId"]),
    category: readString(row, ["category", "Category"]),
    item_name: readString(row, ["item_name", "ItemName"]),
    required_value: readOptionalString(row, ["required_value", "RequiredValue"]),
    required_type: normalizeRequiredType(readValue(row, ["required_type", "RequiredType"])),
    photo_required: isSupplyRowActive(readValue(row, ["photo_required", "PhotoRequired"])),
    active: isSupplyRowActive(readValue(row, ["active", "Active"])),
    notes: readOptionalString(row, ["notes", "Notes"]),
  };
}

export function normalizeSupplyReport(row: RawRow): SupplyReport {
  return {
    report_id: readString(row, ["report_id", "ReportID", "ReportId"]),
    apartment_id: readString(row, ["apartment_id", "ApartmentID", "ApartmentId"]),
    reporter_initials: readOptionalString(row, ["reporter_initials", "ReporterInitials"]),
    reported_at: readString(row, ["reported_at", "ReportedAt"]),
    general_notes: readOptionalString(row, ["general_notes", "GeneralNotes"]),
    overall_status: normalizeOverallStatus(readValue(row, ["overall_status", "OverallStatus"])),
  };
}

export function normalizeSupplyReportItem(row: RawRow): SupplyReportItem {
  return {
    report_item_id: readString(row, ["report_item_id", "ReportItemID", "ReportItemId"]),
    report_id: readString(row, ["report_id", "ReportID", "ReportId"]),
    standard_item_id: readOptionalString(row, ["standard_item_id", "StandardItemID", "StandardItemId"]),
    category: readOptionalString(row, ["category", "Category"]),
    item_name: readString(row, ["item_name", "ItemName"]),
    required_value: readOptionalString(row, ["required_value", "RequiredValue"]),
    reported_status: normalizeReportedStatus(readValue(row, ["reported_status", "ReportedStatus"])),
    actual_value: readOptionalString(row, ["actual_value", "ActualValue"]),
    item_notes: readOptionalString(row, ["item_notes", "ItemNotes"]),
  };
}

export function normalizeSupplyReportPhoto(row: RawRow): SupplyReportPhoto {
  return {
    photo_id: readString(row, ["photo_id", "PhotoID", "PhotoId"]),
    report_id: readString(row, ["report_id", "ReportID", "ReportId"]),
    apartment_id: readString(row, ["apartment_id", "ApartmentID", "ApartmentId"]),
    category: normalizePhotoCategory(readValue(row, ["category", "Category"])),
    drive_file_id: readOptionalString(row, ["drive_file_id", "DriveFileID", "DriveFileId"]),
    drive_url: readOptionalString(row, ["drive_url", "DriveUrl"]),
    uploaded_at: readOptionalString(row, ["uploaded_at", "UploadedAt"]),
    notes: readOptionalString(row, ["notes", "Notes"]),
  };
}

export function normalizeSupplyReportPhotos(rows: unknown): SupplyReportPhoto[] {
  return asRows(rows).map(normalizeSupplyReportPhoto);
}

export function normalizeSupplyApartments(rows: unknown): SupplyApartment[] {
  return asRows(rows)
    .map(normalizeSupplyApartment)
    .filter((apartment) => apartment.active)
    .sort((a, b) => {
      const locationCompare = a.location.localeCompare(b.location, "he");
      if (locationCompare !== 0) return locationCompare;
      return a.mission.localeCompare(b.mission, "he");
    });
}

export function normalizeSupplyApartmentResponse(row: unknown): SupplyApartment | null {
  const apartment = asRow(row);
  return apartment ? normalizeSupplyApartment(apartment) : null;
}

export function normalizeSupplyStandardItems(rows: unknown, apartmentId: string): SupplyStandardItem[] {
  return asRows(rows)
    .map(normalizeSupplyStandardItem)
    .filter((item) => item.active && item.apartment_id === apartmentId)
    .sort((a, b) => {
      const categoryCompare = a.category.localeCompare(b.category, "he");
      if (categoryCompare !== 0) return categoryCompare;
      return a.item_name.localeCompare(b.item_name, "he");
    });
}

export function normalizeSupplyReportsByApartment(
  rows: unknown,
  apartmentId: string,
  options: SupplyReportsQueryOptions = {},
): SupplyReportsByApartmentResult {
  const limit = normalizeLimit(options.limit);
  const page = normalizePage(options.page);
  const allReports = asRows(rows)
    .map(normalizeSupplyReport)
    .filter((report) => report.apartment_id === apartmentId)
    .sort((a, b) => toTimestamp(b.reported_at) - toTimestamp(a.reported_at));

  const startIndex = (page - 1) * limit;

  return {
    reports: allReports.slice(startIndex, startIndex + limit),
    total: allReports.length,
    page,
    limit,
  };
}

export function normalizeSupplyReportDetails(payload: unknown): SupplyReportDetails | null {
  const source = payload && typeof payload === "object" ? (payload as RawReportDetailsPayload) : null;
  if (!source) return null;

  const normalizedReportRow = asRow(source.report);
  const normalizedApartmentRow = asRow(source.apartment);

  if (!normalizedReportRow || !normalizedApartmentRow) {
    return null;
  }

  return {
    report: normalizeSupplyReport(normalizedReportRow),
    apartment: normalizeSupplyApartment(normalizedApartmentRow),
    items: asRows(source.items).map(normalizeSupplyReportItem),
    photos: asRows(source.photos).map(normalizeSupplyReportPhoto),
  };
}

export function normalizeSupplyReportingContext(payload: unknown): SupplyReportingContext | null {
  const source = payload && typeof payload === "object" ? (payload as RawReportingContextPayload) : null;
  if (!source) return null;

  const apartment = normalizeSupplyApartmentResponse(source.apartment);
  if (!apartment) return null;

  return {
    apartment,
    standardItems: normalizeSupplyStandardItems(
      source.standardItems ?? source.standard_items ?? [],
      apartment.apartment_id,
    ),
  };
}

export function normalizeSupplyCreateReportResult(payload: unknown): SupplyCreateReportResult | null {
  const source = payload && typeof payload === "object" ? (payload as RawCreateReportPayload) : null;
  if (!source) return null;

  const reportRow = asRow(source.report);
  if (!reportRow) return null;

  const itemsCount = Number(source.items_count ?? 0);

  return {
    report: normalizeSupplyReport(reportRow),
    items_count: Number.isFinite(itemsCount) ? itemsCount : 0,
  };
}
