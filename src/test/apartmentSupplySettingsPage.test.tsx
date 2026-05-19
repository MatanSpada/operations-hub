import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ApartmentSupplyControlPage } from "@/modules/apartment-supply-control/ApartmentSupplyControlPage";
import { SupplyApartment, SupplyStandardItem } from "@/types";

const { supplyControlApi } = vi.hoisted(() => ({
  supplyControlApi: {
    getSupplyApartments: vi.fn(),
    getSupplyStandardItems: vi.fn(),
    createSupplyApartment: vi.fn(),
    updateSupplyApartment: vi.fn(),
    deactivateSupplyApartment: vi.fn(),
    createSupplyStandardItem: vi.fn(),
    updateSupplyStandardItem: vi.fn(),
    deactivateSupplyStandardItem: vi.fn(),
    seedSupplyDemoData: vi.fn(),
  },
}));

vi.mock("@/modules/apartment-supply-control/api", () => ({
  supplyControlApi,
}));

const apartment: SupplyApartment = {
  apartment_id: "apt-1",
  location: "רמת השבים",
  mission: "אח + אורן",
  type: "דירה",
  notes: "",
  active: true,
};

const items: SupplyStandardItem[] = [
  {
    standard_item_id: "std-1",
    apartment_id: "apt-1",
    category: "מצעים",
    item_name: "מיטה",
    required_value: "13",
    required_type: "quantity",
    photo_required: true,
    active: true,
  },
];

describe("ApartmentSupplyControlPage settings", () => {
  beforeEach(() => {
    Object.values(supplyControlApi).forEach((fn) => fn.mockReset());
    supplyControlApi.createSupplyApartment.mockResolvedValue({ data: apartment });
    supplyControlApi.updateSupplyApartment.mockResolvedValue({ data: apartment });
    supplyControlApi.deactivateSupplyApartment.mockResolvedValue({ data: { apartment_id: apartment.apartment_id, active: false } });
    supplyControlApi.createSupplyStandardItem.mockResolvedValue({ data: items[0] });
    supplyControlApi.updateSupplyStandardItem.mockResolvedValue({ data: items[0] });
    supplyControlApi.deactivateSupplyStandardItem.mockResolvedValue({ data: { standard_item_id: items[0].standard_item_id, active: false } });
    supplyControlApi.seedSupplyDemoData.mockResolvedValue({ data: { apartments: 7, items: 43 } });
  });

  it("renders the settings tab and shows an empty state", async () => {
    supplyControlApi.getSupplyApartments.mockResolvedValue({ data: [] });
    supplyControlApi.getSupplyStandardItems.mockResolvedValue({ data: [] });

    render(<ApartmentSupplyControlPage initialSection="settings" />);

    expect(await screen.findByRole("heading", { name: "הגדרות בקרת אספקה" })).toBeInTheDocument();
    expect(
      screen.getByText("אין עדיין דירות פעילות. אפשר להוסיף דירה חדשה או לטעון נתוני דמה."),
    ).toBeInTheDocument();
  });

  it("shows the selected apartment checklist when apartments and items are available", async () => {
    supplyControlApi.getSupplyApartments.mockResolvedValue({ data: [apartment] });
    supplyControlApi.getSupplyStandardItems.mockResolvedValue({ data: items });

    render(<ApartmentSupplyControlPage initialSection="settings" />);

    expect((await screen.findAllByText("רמת השבים")).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(supplyControlApi.getSupplyStandardItems).toHaveBeenCalledWith("apt-1");
    });

    expect(screen.getByText("מיטה")).toBeInTheDocument();
    expect(screen.getByText("13")).toBeInTheDocument();
    expect(screen.getByText("כמות")).toBeInTheDocument();
  });
});
