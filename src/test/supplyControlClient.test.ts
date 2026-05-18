import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createSupplyApartment,
  createSupplyStandardItem,
  seedSupplyDemoData,
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
});
