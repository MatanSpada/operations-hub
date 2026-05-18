import { ApiActionResult, postActionDetailed } from "@/api";
import {
  SupplyApartment,
  SupplyReportDetails,
  SupplyReportsByApartmentResult,
  SupplyReportsQueryOptions,
  SupplyStandardItem,
} from "@/types";
import {
  normalizeSupplyApartmentResponse,
  normalizeSupplyApartments,
  normalizeSupplyReportDetails,
  normalizeSupplyReportsByApartment,
  normalizeSupplyStandardItems,
} from "@/modules/apartment-supply-control/normalize";

function buildErrorResult<T>(error: string): ApiActionResult<T> {
  return {
    data: null,
    error,
  };
}

export async function getSupplyApartments(): Promise<ApiActionResult<SupplyApartment[]>> {
  const result = await postActionDetailed<unknown[]>("supply_get_apartments", {});
  if (!result.data) return buildErrorResult(result.error || "Failed to load supply apartments");

  return {
    data: normalizeSupplyApartments(result.data),
  };
}

export async function getSupplyApartment(apartmentId: string): Promise<ApiActionResult<SupplyApartment>> {
  const result = await postActionDetailed<unknown>("supply_get_apartment", {
    apartmentId,
  });
  if (!result.data) return buildErrorResult(result.error || "Failed to load supply apartment");

  const apartment = normalizeSupplyApartmentResponse(result.data);
  if (!apartment) return buildErrorResult("Supply apartment not found");

  return { data: apartment };
}

export async function getSupplyStandardItems(apartmentId: string): Promise<ApiActionResult<SupplyStandardItem[]>> {
  const result = await postActionDetailed<unknown[]>("supply_get_standard_items", {
    apartmentId,
  });
  if (!result.data) return buildErrorResult(result.error || "Failed to load supply standard items");

  return {
    data: normalizeSupplyStandardItems(result.data, apartmentId),
  };
}

export async function getSupplyReportsByApartment(
  apartmentId: string,
  options: SupplyReportsQueryOptions = {},
): Promise<ApiActionResult<SupplyReportsByApartmentResult>> {
  const result = await postActionDetailed<unknown[]>("supply_get_reports_by_apartment", {
    apartmentId,
    limit: options.limit,
    page: options.page,
  });
  if (!result.data) return buildErrorResult(result.error || "Failed to load supply reports");

  return {
    data: normalizeSupplyReportsByApartment(result.data, apartmentId, options),
  };
}

export async function getSupplyReportDetails(reportId: string): Promise<ApiActionResult<SupplyReportDetails>> {
  const result = await postActionDetailed<unknown>("supply_get_report_details", {
    reportId,
  });
  if (!result.data) return buildErrorResult(result.error || "Failed to load supply report details");

  const details = normalizeSupplyReportDetails(result.data);
  if (!details) return buildErrorResult("Supply report details not found");

  return { data: details };
}

export const supplyControlApi = {
  getSupplyApartments,
  getSupplyApartment,
  getSupplyStandardItems,
  getSupplyReportsByApartment,
  getSupplyReportDetails,
};

