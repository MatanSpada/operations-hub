import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApartmentSupplyControlPage } from "@/modules/apartment-supply-control/ApartmentSupplyControlPage";
import { SupplyApartment, SupplyStandardItem } from "@/types";

const { supplyControlApi } = vi.hoisted(() => ({
  supplyControlApi: {
    getSupplyApartments: vi.fn(),
    getSupplyStandardItems: vi.fn(),
    getSupplyPhotoRequirements: vi.fn(),
    createSupplyApartment: vi.fn(),
    updateSupplyApartment: vi.fn(),
    deactivateSupplyApartment: vi.fn(),
    createSupplyStandardItem: vi.fn(),
    updateSupplyStandardItem: vi.fn(),
    deactivateSupplyStandardItem: vi.fn(),
    createSupplyPhotoRequirement: vi.fn(),
    updateSupplyPhotoRequirement: vi.fn(),
    deactivateSupplyPhotoRequirement: vi.fn(),
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
  report_token: "demo_ramat_hashavim",
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

const photoRequirements = [
  {
    photo_requirement_id: "photo-req-1",
    apartment_id: "apt-1",
    category: "מקרר" as const,
    required: true,
    active: true,
  },
  {
    photo_requirement_id: "photo-req-2",
    apartment_id: "apt-1",
    category: "מצעים" as const,
    required: false,
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
    supplyControlApi.getSupplyPhotoRequirements.mockResolvedValue({ data: photoRequirements });
    supplyControlApi.createSupplyPhotoRequirement.mockResolvedValue({ data: photoRequirements[0] });
    supplyControlApi.updateSupplyPhotoRequirement.mockResolvedValue({ data: photoRequirements[0] });
    supplyControlApi.deactivateSupplyPhotoRequirement.mockResolvedValue({ data: { photo_requirement_id: "photo-req-1", active: false } });
    supplyControlApi.seedSupplyDemoData.mockResolvedValue({ data: { apartments: 7, items: 43 } });
  });

  it("renders the settings tab and shows an empty state", async () => {
    supplyControlApi.getSupplyApartments.mockResolvedValue({ data: [] });
    supplyControlApi.getSupplyStandardItems.mockResolvedValue({ data: [] });
    supplyControlApi.getSupplyPhotoRequirements.mockResolvedValue({ data: [] });

    render(<ApartmentSupplyControlPage initialSection="settings" />);

    expect(await screen.findByRole("heading", { name: "הגדרות בקרת אספקה" })).toBeInTheDocument();
    expect(screen.getByText("אין עדיין דירות פעילות. אפשר להוסיף דירה חדשה כדי להתחיל.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "טען נתוני דמה" })).not.toBeInTheDocument();
  });

  it("shows the selected apartment checklist when apartments and items are available", async () => {
    supplyControlApi.getSupplyApartments.mockResolvedValue({ data: [apartment] });
    supplyControlApi.getSupplyStandardItems.mockResolvedValue({ data: items });
    supplyControlApi.getSupplyPhotoRequirements.mockResolvedValue({ data: photoRequirements });

    render(<ApartmentSupplyControlPage initialSection="settings" />);

    expect((await screen.findAllByText("רמת השבים")).length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(supplyControlApi.getSupplyStandardItems).toHaveBeenCalledWith("apt-1");
    });

    expect(screen.getByText("מיטה")).toBeInTheDocument();
    expect(screen.getByText("13")).toBeInTheDocument();
    expect(screen.getByText("כמות")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ערוך דירה רמת השבים/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /מחק דירה/ }).length).toBeGreaterThan(0);
    expect(screen.queryByText("תקן אספקה קבוע")).not.toBeInTheDocument();
    expect(screen.queryByText("פריט | קטגוריה | ערך נדרש | סוג דרישה | צילום חובה | פעולות")).not.toBeInTheDocument();
    expect(screen.getAllByText("קישור דיווח").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "העתק קישור" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "פתח טופס דיווח" })).toBeInTheDocument();
    expect(screen.getByDisplayValue(/supplyReportToken=/)).toBeInTheDocument();
    expect(screen.getByText("דרישות תמונות")).toBeInTheDocument();
    expect(screen.getByText("מקרר")).toBeInTheDocument();
    expect(screen.getAllByText("מצעים").length).toBeGreaterThan(0);
  });

  it("defaults new standard items to required photos", async () => {
    supplyControlApi.getSupplyApartments.mockResolvedValue({ data: [apartment] });
    supplyControlApi.getSupplyStandardItems.mockResolvedValue({ data: items });
    supplyControlApi.getSupplyPhotoRequirements.mockResolvedValue({ data: photoRequirements });

    render(<ApartmentSupplyControlPage initialSection="settings" />);

    await screen.findByText("מיטה");
    fireEvent.click(screen.getByRole("button", { name: "הוסף פריט" }));

    expect(await screen.findByRole("heading", { name: "הוספת פריט תקן" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeChecked();
  });

  it("lets the manager edit and deactivate photo requirements", async () => {
    supplyControlApi.getSupplyApartments.mockResolvedValue({ data: [apartment] });
    supplyControlApi.getSupplyStandardItems.mockResolvedValue({ data: items });
    supplyControlApi.getSupplyPhotoRequirements.mockResolvedValue({ data: photoRequirements });

    render(<ApartmentSupplyControlPage initialSection="settings" />);

    await screen.findByText("דרישות תמונות");
    fireEvent.click(screen.getAllByRole("button", { name: "ערוך" })[1]);
    expect(await screen.findByRole("heading", { name: "עריכת דרישת תמונה" })).toBeInTheDocument();
    expect(screen.getByRole("checkbox")).toBeChecked();
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "שמור" }));

    await waitFor(() => {
      expect(supplyControlApi.updateSupplyPhotoRequirement).toHaveBeenCalled();
    });

    fireEvent.click(screen.getAllByRole("button", { name: "מחק" })[1]);
    expect(await screen.findByRole("heading", { name: "מחיקת קטגוריית תמונה" })).toBeInTheDocument();
    expect(screen.getByText("קטגוריית התמונה תוסתר מטופס הדיווח. תמונות ודיווחים קיימים לא יימחקו.")).toBeInTheDocument();
  });
});
