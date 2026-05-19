import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSupplyReport,
  createSupplyApartment,
  getSupplyReportDetails,
  getSupplyReportsByApartment,
  getSupplyReportingContext,
  uploadSupplyReportPhotos,
  createSupplyStandardItem,
  seedSupplyDemoData,
  updateSupplyReport,
  updateSupplyApartment,
  updateSupplyStandardItem,
} from "@/modules/apartment-supply-control/api";

const { postActionDetailed } = vi.hoisted(() => ({
  postActionDetailed: vi.fn(),
}));

vi.mock("@/api", () => ({
  postActionDetailed,
}));

describe("supply control client actions", () => {
  beforeEach(() => {
    postActionDetailed.mockReset();
  });

  it("maps create apartment payload to the correct Apps Script action", async () => {
    postActionDetailed.mockResolvedValue({
      data: {
        apartment_id: "apt-1",
        location: "רמת השבים",
        mission: "אח + אורן",
        type: "דירה",
        active: true,
      },
    });

    await createSupplyApartment({
      location: "רמת השבים",
      mission: "אח + אורן",
      type: "דירה",
      notes: "הערה",
    });

    expect(postActionDetailed).toHaveBeenCalledWith("supply_create_apartment", {
      location: "רמת השבים",
      mission: "אח + אורן",
      type: "דירה",
      notes: "הערה",
    });
  });

  it("maps update apartment payload to the correct Apps Script action", async () => {
    postActionDetailed.mockResolvedValue({
      data: {
        apartment_id: "apt-1",
        location: "כפר האורנים",
        mission: "חוסם + דפנה",
        type: "דירה",
        active: true,
      },
    });

    await updateSupplyApartment("apt-1", {
      location: "כפר האורנים",
      mission: "חוסם + דפנה",
      type: "דירה",
      notes: "",
    });

    expect(postActionDetailed).toHaveBeenCalledWith("supply_update_apartment", {
      apartmentId: "apt-1",
      location: "כפר האורנים",
      mission: "חוסם + דפנה",
      type: "דירה",
      notes: "",
    });
  });

  it("maps create standard item payload to the correct Apps Script action", async () => {
    postActionDetailed.mockResolvedValue({
      data: {
        standard_item_id: "std-1",
        apartment_id: "apt-1",
        category: "מקרר",
        item_name: "מקרר",
        required_value: "1",
        required_type: "quantity",
        photo_required: true,
        active: true,
      },
    });

    await createSupplyStandardItem({
      apartment_id: "apt-1",
      category: "מקרר",
      item_name: "מקרר",
      required_value: "1",
      required_type: "quantity",
      photo_required: true,
      notes: "",
    });

    expect(postActionDetailed).toHaveBeenCalledWith("supply_create_standard_item", {
      apartment_id: "apt-1",
      category: "מקרר",
      item_name: "מקרר",
      required_value: "1",
      required_type: "quantity",
      photo_required: true,
      notes: "",
    });
  });

  it("maps update standard item payload to the correct Apps Script action", async () => {
    postActionDetailed.mockResolvedValue({
      data: {
        standard_item_id: "std-1",
        apartment_id: "apt-1",
        category: "ציוד כללי",
        item_name: "תמי 4",
        required_value: "קיים",
        required_type: "exists",
        photo_required: false,
        active: true,
      },
    });

    await updateSupplyStandardItem("std-1", {
      apartment_id: "apt-1",
      category: "ציוד כללי",
      item_name: "תמי 4",
      required_value: "קיים",
      required_type: "exists",
      photo_required: false,
      notes: "תקין",
    });

    expect(postActionDetailed).toHaveBeenCalledWith("supply_update_standard_item", {
      standardItemId: "std-1",
      apartment_id: "apt-1",
      category: "ציוד כללי",
      item_name: "תמי 4",
      required_value: "קיים",
      required_type: "exists",
      photo_required: false,
      notes: "תקין",
    });
  });

  it("exposes the demo seed action", async () => {
    postActionDetailed.mockResolvedValue({
      data: {
        apartments: 7,
        items: 43,
      },
    });

    await seedSupplyDemoData();

    expect(postActionDetailed).toHaveBeenCalledWith("supply_seed_demo_data", {});
  });

  it("maps get reporting context params to the correct Apps Script action", async () => {
    postActionDetailed.mockResolvedValue({
      data: {
        apartment: {
          apartment_id: "apt-1",
          location: "עזרי",
          mission: "ורד",
          type: "דירה",
          active: true,
        },
        standardItems: [],
      },
    });

    await getSupplyReportingContext({ reportToken: "demo_ezri" });

    expect(postActionDetailed).toHaveBeenCalledWith("supply_get_reporting_context", {
      apartmentId: undefined,
      reportToken: "demo_ezri",
    });
  });

  it("maps create report payload to the correct Apps Script action", async () => {
    postActionDetailed.mockResolvedValue({
      data: {
        report: {
          report_id: "rep-1",
          apartment_id: "apt-1",
          reporter_initials: "מ.ש",
          reported_at: "2026-05-19T09:00:00.000Z",
          overall_status: "partial",
        },
        items_count: 2,
      },
    });

    await createSupplyReport({
      apartment_id: "apt-1",
      reporter_initials: "מ.ש",
      general_notes: "חסר ציוד",
      items: [
        {
          standard_item_id: "std-1",
          item_name: "מיטה",
          required_value: "13",
          reported_status: "partial",
          actual_value: "10",
          item_notes: "חסרות 3",
        },
      ],
    });

    expect(postActionDetailed).toHaveBeenCalledWith("supply_create_report", {
      apartment_id: "apt-1",
      reporter_initials: "מ.ש",
      general_notes: "חסר ציוד",
      items: [
        {
          standard_item_id: "std-1",
          item_name: "מיטה",
          required_value: "13",
          reported_status: "partial",
          actual_value: "10",
          item_notes: "חסרות 3",
        },
      ],
    });
  });

  it("maps update report payload to the correct Apps Script action", async () => {
    postActionDetailed.mockResolvedValue({
      data: {
        report: {
          report_id: "rep-1",
          apartment_id: "apt-1",
          reporter_initials: "מ.ש",
          reported_at: "2026-05-19T09:00:00.000Z",
          overall_status: "ok",
        },
        items_count: 1,
      },
    });

    await updateSupplyReport({
      report_id: "rep-1",
      apartment_id: "apt-1",
      reporter_initials: "מ.ש",
      general_notes: "עודכן",
      items: [
        {
          standard_item_id: "std-1",
          item_name: "מיטה",
          required_value: "13",
          reported_status: "ok",
          actual_value: "",
          item_notes: "",
        },
      ],
    });

    expect(postActionDetailed).toHaveBeenCalledWith("supply_update_report", {
      report_id: "rep-1",
      apartment_id: "apt-1",
      reporter_initials: "מ.ש",
      general_notes: "עודכן",
      items: [
        {
          standard_item_id: "std-1",
          item_name: "מיטה",
          required_value: "13",
          reported_status: "ok",
          actual_value: "",
          item_notes: "",
        },
      ],
    });
  });

  it("maps reports-by-apartment params to the correct Apps Script action", async () => {
    postActionDetailed.mockResolvedValue({
      data: [],
    });

    await getSupplyReportsByApartment("apt-1", { page: 2, limit: 30 });

    expect(postActionDetailed).toHaveBeenCalledWith("supply_get_reports_by_apartment", {
      apartmentId: "apt-1",
      limit: 30,
      page: 2,
    });
  });

  it("maps report details params to the correct Apps Script action", async () => {
    postActionDetailed.mockResolvedValue({
      data: {
        report: {
          report_id: "rep-1",
          apartment_id: "apt-1",
          reported_at: "2026-05-20T09:00:00.000Z",
        },
        apartment: {
          apartment_id: "apt-1",
          location: "עזרי",
          mission: "ורד",
          type: "דירה",
          active: true,
        },
        items: [],
        photos: [],
      },
    });

    await getSupplyReportDetails("rep-1");

    expect(postActionDetailed).toHaveBeenCalledWith("supply_get_report_details", {
      reportId: "rep-1",
    });
  });

  it("maps upload report photos payload to the correct Apps Script action", async () => {
    postActionDetailed.mockResolvedValue({
      data: [
        {
          photo_id: "photo-1",
          report_id: "rep-1",
          apartment_id: "apt-1",
          category: "מקרר",
          drive_file_id: "file-1",
          drive_url: "https://drive.google.com/uc?export=view&id=file-1",
          uploaded_at: "2026-05-20T10:00:00.000Z",
        },
      ],
    });

    await uploadSupplyReportPhotos({
      report_id: "rep-1",
      apartment_id: "apt-1",
      photos: [
        {
          category: "מקרר",
          filename: "fridge.jpg",
          mime_type: "image/jpeg",
          base64_data: "ZmFrZQ==",
          notes: "",
        },
      ],
    });

    expect(postActionDetailed).toHaveBeenCalledWith("supply_upload_report_photos", {
      report_id: "rep-1",
      apartment_id: "apt-1",
      photos: [
        {
          category: "מקרר",
          filename: "fridge.jpg",
          mime_type: "image/jpeg",
          base64_data: "ZmFrZQ==",
          notes: "",
        },
      ],
    });
  });
});
