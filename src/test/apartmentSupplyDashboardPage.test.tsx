import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApartmentSupplyControlPage } from "@/modules/apartment-supply-control/ApartmentSupplyControlPage";
import { SupplyApartment, SupplyReport, SupplyReportDetails, SupplyStandardItem } from "@/types";

const { supplyControlApi } = vi.hoisted(() => ({
  supplyControlApi: {
    getSupplyApartments: vi.fn(),
    getSupplyStandardItems: vi.fn(),
    getSupplyReportsByApartment: vi.fn(),
    getSupplyReportDetails: vi.fn(),
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

const apartments: SupplyApartment[] = [
  {
    apartment_id: "apt_ezri",
    location: "עזרי",
    mission: "ורד",
    type: "דירה",
    active: true,
  },
  {
    apartment_id: "apt_givaa",
    location: "גבעה",
    mission: "אנקיפסום",
    type: "דירה",
    active: true,
  },
];

const standardItemsByApartment: Record<string, SupplyStandardItem[]> = {
  apt_ezri: [
    {
      standard_item_id: "std-bed",
      apartment_id: "apt_ezri",
      category: "מצעים",
      item_name: "מיטה",
      required_value: "1",
      required_type: "quantity",
      photo_required: true,
      active: true,
    },
  ],
  apt_givaa: [
    {
      standard_item_id: "std-fridge",
      apartment_id: "apt_givaa",
      category: "מקרר",
      item_name: "מקרר",
      required_value: "1",
      required_type: "quantity",
      photo_required: true,
      active: true,
    },
  ],
};

const reportsByApartment: Record<string, SupplyReport[]> = {
  apt_ezri: [
    {
      report_id: "rep-may",
      apartment_id: "apt_ezri",
      reporter_initials: "מ.ש",
      reported_at: "2026-05-20T09:00:00.000Z",
      general_notes: "חסרה מיטה",
      overall_status: "missing",
    },
    {
      report_id: "rep-apr",
      apartment_id: "apt_ezri",
      reporter_initials: "א.כ",
      reported_at: "2026-04-18T09:00:00.000Z",
      general_notes: "",
      overall_status: "ok",
    },
  ],
  apt_givaa: [],
};

const reportDetailsById: Record<string, SupplyReportDetails> = {
  "rep-may": {
    report: reportsByApartment.apt_ezri[0],
    apartment: apartments[0],
    items: [
      {
        report_item_id: "item-1",
        report_id: "rep-may",
        standard_item_id: "std-bed",
        item_name: "מיטה",
        required_value: "1",
        reported_status: "missing",
        actual_value: "",
        item_notes: "אין מיטה",
      },
    ],
    photos: [],
  },
  "rep-apr": {
    report: reportsByApartment.apt_ezri[1],
    apartment: apartments[0],
    items: [],
    photos: [],
  },
};

describe("ApartmentSupplyControlPage dashboard", () => {
  beforeEach(() => {
    Object.values(supplyControlApi).forEach((fn) => fn.mockReset());

    supplyControlApi.getSupplyApartments.mockResolvedValue({ data: apartments });
    supplyControlApi.getSupplyStandardItems.mockImplementation((apartmentId: string) =>
      Promise.resolve({ data: standardItemsByApartment[apartmentId] || [] }),
    );
    supplyControlApi.getSupplyReportsByApartment.mockImplementation((apartmentId: string) =>
      Promise.resolve({
        data: {
          reports: reportsByApartment[apartmentId] || [],
          total: (reportsByApartment[apartmentId] || []).length,
          page: 1,
          limit: 30,
        },
      }),
    );
    supplyControlApi.getSupplyReportDetails.mockImplementation((reportId: string) =>
      Promise.resolve({ data: reportDetailsById[reportId] }),
    );
  });

  it("renders KPI cards, summaries, and recent reports instead of the old placeholder", async () => {
    render(<ApartmentSupplyControlPage initialSection="dashboard" />);

    const monthInput = await screen.findByLabelText("בחירת חודש");
    fireEvent.change(monthInput, { target: { value: "2026-05" } });

    expect(await screen.findByRole("heading", { name: "דשבורד בקרת אספקה" })).toBeInTheDocument();
    expect(screen.queryByText("דשבורד בקרת אספקה", { selector: ".text-lg" })).not.toBeInTheDocument();
    expect(screen.getByText('סה״כ דירות פעילות')).toBeInTheDocument();
    expect(screen.getByText("דירות שדווחו החודש")).toBeInTheDocument();
    expect(screen.getAllByText("דירות ללא דיווח החודש").length).toBeGreaterThan(0);
    expect(screen.getByText('סה״כ דיווחים החודש')).toBeInTheDocument();
    expect(screen.getByText("דיווחים עם חוסרים / חלקי / חריגים")).toBeInTheDocument();
    expect(screen.getByText("אחוז דיווחים תקינים")).toBeInTheDocument();

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    expect(screen.getByText("0%")).toBeInTheDocument();
    expect(screen.getByText("התפלגות סטטוסים")).toBeInTheDocument();
    expect(screen.getByText("תקלות לפי קטגוריה")).toBeInTheDocument();
    expect(screen.getByText("דיווחים אחרונים")).toBeInTheDocument();
    expect(screen.getAllByText("דירות ללא דיווח החודש").length).toBeGreaterThan(0);
    expect(screen.getByText("גבעה")).toBeInTheDocument();
    expect(screen.getAllByText("עזרי — ורד").length).toBeGreaterThan(0);
  });

  it("changes the selected month and shows the no reports empty state", async () => {
    render(<ApartmentSupplyControlPage initialSection="dashboard" />);

    const monthInput = await screen.findByLabelText("בחירת חודש");
    fireEvent.change(monthInput, { target: { value: "2026-05" } });
    await screen.findByRole("button", { name: /עזרי — ורד/ });

    fireEvent.change(monthInput, { target: { value: "2026-03" } });

    await waitFor(() => {
      expect(screen.getByText("אין דיווחים לחודש שנבחר")).toBeInTheDocument();
    });

    expect(screen.getAllByText("עזרי").length).toBeGreaterThan(0);
    expect(screen.getByText("גבעה")).toBeInTheDocument();
  });

  it("opens the existing report modal from the recent reports list", async () => {
    render(<ApartmentSupplyControlPage initialSection="dashboard" />);

    const monthInput = await screen.findByLabelText("בחירת חודש");
    fireEvent.change(monthInput, { target: { value: "2026-05" } });

    const recentReportButton = await screen.findByRole("button", { name: /עזרי — ורד/ });
    fireEvent.click(recentReportButton);

    expect(await screen.findByRole("heading", { name: "דוח בקרת אספקה" })).toBeInTheDocument();
    expect(screen.getByText("הערות / תקלות שנצפו")).toBeInTheDocument();
    expect(screen.getByText("צ׳ק ליסט אספקה")).toBeInTheDocument();
  });
});
