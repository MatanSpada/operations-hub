import { ApiActionResult, postActionDetailed } from "@/api";
import {
  SupplyApartment,
  SupplyApartmentInput,
  SupplyCreateReportInput,
  SupplyCreateReportResult,
  SupplyPhotoRequirement,
  SupplyPhotoRequirementInput,
  SupplyReportingContext,
  SupplyReportingContextParams,
  SupplyReportDetails,
  SupplyReportsByApartmentResult,
  SupplyReportsQueryOptions,
  SupplyStandardItemInput,
  SupplyStandardItem,
  SupplyReportPhoto,
  SupplyUpdateReportInput,
  SupplyUploadReportPhotosInput,
} from "@/types";
import {
  normalizeSupplyCreateReportResult,
  normalizeSupplyApartmentResponse,
  normalizeSupplyApartments,
  normalizeSupplyReportingContext,
  normalizeSupplyReportDetails,
  normalizeSupplyReportPhotos,
  normalizeSupplyReportsByApartment,
  normalizeSupplyPhotoRequirements,
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

export async function getSupplyPhotoRequirements(apartmentId: string): Promise<ApiActionResult<SupplyPhotoRequirement[]>> {
  const result = await postActionDetailed<unknown[]>("supply_get_photo_requirements", {
    apartmentId,
  });
  if (!result.data) return buildErrorResult(result.error || "Failed to load supply photo requirements");

  return {
    data: normalizeSupplyPhotoRequirements(result.data, apartmentId),
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

export async function getSupplyReportingContext(
  params: SupplyReportingContextParams,
): Promise<ApiActionResult<SupplyReportingContext>> {
  const result = await postActionDetailed<unknown>("supply_get_reporting_context", {
    apartmentId: params.apartmentId,
    reportToken: params.reportToken,
  });
  if (!result.data) return buildErrorResult(result.error || "Failed to load supply reporting context");

  const context = normalizeSupplyReportingContext(result.data);
  if (!context) return buildErrorResult("Supply reporting context not found");

  return { data: context };
}

export async function createSupplyReport(
  input: SupplyCreateReportInput,
): Promise<ApiActionResult<SupplyCreateReportResult>> {
  const result = await postActionDetailed<unknown>("supply_create_report", input);
  if (!result.data) return buildErrorResult(result.error || "Failed to create supply report");

  const reportResult = normalizeSupplyCreateReportResult(result.data);
  if (!reportResult) return buildErrorResult("Supply report creation result is invalid");

  return { data: reportResult };
}

export async function updateSupplyReport(
  input: SupplyUpdateReportInput,
): Promise<ApiActionResult<SupplyCreateReportResult>> {
  const result = await postActionDetailed<unknown>("supply_update_report", input);
  if (!result.data) return buildErrorResult(result.error || "Failed to update supply report");

  const reportResult = normalizeSupplyCreateReportResult(result.data);
  if (!reportResult) return buildErrorResult("Supply report update result is invalid");

  return { data: reportResult };
}

export async function uploadSupplyReportPhotos(
  input: SupplyUploadReportPhotosInput,
): Promise<ApiActionResult<SupplyReportPhoto[]>> {
  const result = await postActionDetailed<unknown[]>("supply_upload_report_photos", input);
  if (!result.data) return buildErrorResult(result.error || "Failed to upload supply report photos");

  return {
    data: normalizeSupplyReportPhotos(result.data),
  };
}

export async function createSupplyApartment(
  input: SupplyApartmentInput,
): Promise<ApiActionResult<SupplyApartment>> {
  const result = await postActionDetailed<unknown>("supply_create_apartment", input);
  if (!result.data) return buildErrorResult(result.error || "Failed to create supply apartment");

  const apartment = normalizeSupplyApartmentResponse(result.data);
  if (!apartment) return buildErrorResult("Supply apartment not found after creation");

  return { data: apartment };
}

export async function updateSupplyApartment(
  apartmentId: string,
  input: SupplyApartmentInput,
): Promise<ApiActionResult<SupplyApartment>> {
  const result = await postActionDetailed<unknown>("supply_update_apartment", {
    apartmentId,
    ...input,
  });
  if (!result.data) return buildErrorResult(result.error || "Failed to update supply apartment");

  const apartment = normalizeSupplyApartmentResponse(result.data);
  if (!apartment) return buildErrorResult("Supply apartment not found after update");

  return { data: apartment };
}

export async function deactivateSupplyApartment(
  apartmentId: string,
): Promise<ApiActionResult<{ apartment_id: string; active: boolean }>> {
  const result = await postActionDetailed<{ apartment_id: string; active: boolean }>(
    "supply_deactivate_apartment",
    { apartmentId },
  );
  if (!result.data) return buildErrorResult(result.error || "Failed to deactivate supply apartment");

  return { data: result.data };
}

export async function createSupplyStandardItem(
  input: SupplyStandardItemInput,
): Promise<ApiActionResult<SupplyStandardItem>> {
  const result = await postActionDetailed<unknown>("supply_create_standard_item", input);
  if (!result.data) return buildErrorResult(result.error || "Failed to create supply standard item");

  const items = normalizeSupplyStandardItems([result.data], input.apartment_id);
  const item = items[0];
  if (!item) return buildErrorResult("Supply standard item not found after creation");

  return { data: item };
}

export async function updateSupplyStandardItem(
  standardItemId: string,
  input: SupplyStandardItemInput,
): Promise<ApiActionResult<SupplyStandardItem>> {
  const result = await postActionDetailed<unknown>("supply_update_standard_item", {
    standardItemId,
    ...input,
  });
  if (!result.data) return buildErrorResult(result.error || "Failed to update supply standard item");

  const items = normalizeSupplyStandardItems([result.data], input.apartment_id);
  const item = items[0];
  if (!item) return buildErrorResult("Supply standard item not found after update");

  return { data: item };
}

export async function deactivateSupplyStandardItem(
  standardItemId: string,
): Promise<ApiActionResult<{ standard_item_id: string; active: boolean }>> {
  const result = await postActionDetailed<{ standard_item_id: string; active: boolean }>(
    "supply_deactivate_standard_item",
    { standardItemId },
  );
  if (!result.data) return buildErrorResult(result.error || "Failed to deactivate supply standard item");

  return { data: result.data };
}

export async function updateSupplyPhotoRequirement(
  photoRequirementId: string,
  input: SupplyPhotoRequirementInput,
): Promise<ApiActionResult<SupplyPhotoRequirement>> {
  const result = await postActionDetailed<unknown>("supply_update_photo_requirement", {
    photoRequirementId,
    ...input,
  });
  if (!result.data) return buildErrorResult(result.error || "Failed to update supply photo requirement");

  const requirements = normalizeSupplyPhotoRequirements([result.data], input.apartment_id);
  const requirement = requirements[0];
  if (!requirement) return buildErrorResult("Supply photo requirement not found after update");

  return { data: requirement };
}

export async function createSupplyPhotoRequirement(
  input: SupplyPhotoRequirementInput,
): Promise<ApiActionResult<SupplyPhotoRequirement>> {
  const result = await postActionDetailed<unknown>("supply_create_photo_requirement", input);
  if (!result.data) return buildErrorResult(result.error || "Failed to create supply photo requirement");

  const requirements = normalizeSupplyPhotoRequirements([result.data], input.apartment_id);
  const requirement = requirements[0];
  if (!requirement) return buildErrorResult("Supply photo requirement not found after creation");

  return { data: requirement };
}

export async function createMissingSupplyPhotoRequirements(
  apartmentId: string,
): Promise<ApiActionResult<SupplyPhotoRequirement[]>> {
  const result = await postActionDetailed<unknown[]>("supply_create_missing_default_photo_requirements", {
    apartmentId,
  });
  if (!result.data) return buildErrorResult(result.error || "Failed to create missing supply photo requirements");

  return {
    data: normalizeSupplyPhotoRequirements(result.data, apartmentId),
  };
}

export async function deactivateSupplyPhotoRequirement(
  photoRequirementId: string,
): Promise<ApiActionResult<{ photo_requirement_id: string; active: boolean }>> {
  const result = await postActionDetailed<{ photo_requirement_id: string; active: boolean }>(
    "supply_deactivate_photo_requirement",
    { photoRequirementId },
  );
  if (!result.data) return buildErrorResult(result.error || "Failed to deactivate supply photo requirement");

  return { data: result.data };
}

export async function seedSupplyDemoData(): Promise<ApiActionResult<{ apartments: number; items: number }>> {
  const result = await postActionDetailed<{ apartments: number; items: number }>(
    "supply_seed_demo_data",
    {},
  );
  if (!result.data) return buildErrorResult(result.error || "Failed to seed supply demo data");

  return { data: result.data };
}

export const supplyControlApi = {
  getSupplyApartments,
  getSupplyApartment,
  getSupplyStandardItems,
  getSupplyPhotoRequirements,
  getSupplyReportsByApartment,
  getSupplyReportDetails,
  getSupplyReportingContext,
  createSupplyReport,
  updateSupplyReport,
  uploadSupplyReportPhotos,
  createSupplyApartment,
  updateSupplyApartment,
  deactivateSupplyApartment,
  createSupplyStandardItem,
  updateSupplyStandardItem,
  deactivateSupplyStandardItem,
  updateSupplyPhotoRequirement,
  createSupplyPhotoRequirement,
  createMissingSupplyPhotoRequirements,
  deactivateSupplyPhotoRequirement,
  seedSupplyDemoData,
};
