import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ApartmentSupplyControlPage } from "@/modules/apartment-supply-control/ApartmentSupplyControlPage";
import { SupplyApartment, SupplyReport, SupplyStandardItem } from "@/types";

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

const standardItems: SupplyStandardItem[] = [
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
];

const reports: SupplyReport[] = [
  {
    report_id: "rep-new",
    apartment_id: "apt_ezri",
    reporter_initials: "מ.ש",
    reported_at: "2026-05-20T10:00:00.000Z",
    general_notes: "עודכן",
    overall_status: "ok",
  },
  {
    report_id: "rep-old",
    apartment_id: "apt_ezri",
    reporter_initials: "א.כ",
    reported_at: "2026-05-19T08:00:00.000Z",
    general_notes: "",
    overall_status: "partial",
  },
];

describe("ApartmentSupplyControlPage reports", () => {
  beforeEach(() => {
    Object.values(supplyControlApi).forEach((fn) => fn.mockReset());
    supplyControlApi.getSupplyApartments.mockResolvedValue({ data: apartments });
    supplyControlApi.getSupplyStandardItems.mockResolvedValue({ data: standardItems });
    supplyControlApi.getSupplyReportsByApartment.mockResolvedValue({
      data: {
        reports,
        total: reports.length,
        page: 1,
        limit: 30,
      },
    });
    supplyControlApi.getSupplyReportDetails.mockResolvedValue({
      data: {
        report: reports[0],
        apartment: apartments[0],
        items: [
          {
            report_item_id: "rpt-item-1",
            report_id: "rep-new",
            standard_item_id: "std-bed",
            item_name: "מיטה",
            required_value: "1",
            reported_status: "missing",
            actual_value: "",
            item_notes: "חסרה מיטה",
          },
        ],
        photos: [
          {
            photo_id: "photo-1",
            report_id: "rep-new",
            apartment_id: "apt_ezri",
            category: "מקרר",
            drive_file_id: "file-1",
            drive_url: "https://example.com/fridge.jpg",
            uploaded_at: "2026-05-20T10:05:00.000Z",
          },
        ],
      },
    });
  });

  it("renders a manager reports screen instead of the old placeholder", async () => {
    render(<ApartmentSupplyControlPage initialSection="reports" />);

    expect(await screen.findByRole("heading", { name: "דיווחי בקרת אספקה" })).toBeInTheDocument();
    expect(await screen.findByText("מ.ש")).toBeInTheDocument();
    expect(screen.queryByText("דיווחים לפי דירה")).not.toBeInTheDocument();
    expect(screen.getByText("בחירת דירה")).toBeInTheDocument();
    expect(screen.getAllByText("תאריך").length).toBeGreaterThan(0);
    expect(screen.getAllByText("מדווח").length).toBeGreaterThan(0);
    expect(screen.getAllByText("הערות").length).toBeGreaterThan(0);
    expect(screen.queryByText("סטטוס")).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "עזרי — ורד" })).toBeInTheDocument();
  });

  it("shows reports newest first and opens the full report panel on row click", async () => {
    render(<ApartmentSupplyControlPage initialSection="reports" />);

    await screen.findByText("מ.ש");
    const reportButtons = screen.getAllByRole("button").filter((button) => {
      return button.textContent?.includes("מ.ש") || button.textContent?.includes("א.כ");
    });

    expect(reportButtons[0].textContent).toContain("מ.ש");
    expect(reportButtons[1].textContent).toContain("א.כ");

    fireEvent.click(reportButtons[0]);

    expect(await screen.findByRole("heading", { name: "דוח בקרת אספקה" })).toBeInTheDocument();
    expect(screen.getByText("הערות / תקלות שנצפו")).toBeInTheDocument();
    expect(screen.getByText("צ׳ק ליסט אספקה")).toBeInTheDocument();
    expect(screen.getByText("תמונות מהדיווח")).toBeInTheDocument();
    expect(screen.getByText("חסרה מיטה")).toBeInTheDocument();
    expect(screen.getByText("חסר")).toBeInTheDocument();
  });

  it("groups photos by category and opens/closes the lightbox", async () => {
    render(<ApartmentSupplyControlPage initialSection="reports" />);

    await screen.findByText("מ.ש");
    const reportButtons = screen.getAllByRole("button").filter((button) => button.textContent?.includes("מ.ש"));
    fireEvent.click(reportButtons[0]);

    const thumbnail = await screen.findByAltText("מקרר 1");
    expect(thumbnail).toHaveAttribute("src", "https://drive.google.com/thumbnail?id=file-1&sz=w720");
    expect(screen.getAllByText("לא צורפו תמונות לקטגוריה זו").length).toBeGreaterThan(0);

    fireEvent.click(thumbnail);
    expect(await screen.findByRole("heading", { name: "תצוגת תמונה" })).toBeInTheDocument();
    expect(screen.getByAltText("תמונה 1")).toHaveAttribute(
      "src",
      "https://drive.google.com/thumbnail?id=file-1&sz=w1800",
    );

    const closeButtons = screen.getAllByRole("button", { name: "סגור" });
    fireEvent.click(closeButtons[closeButtons.length - 1]);
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "תצוגת תמונה" })).not.toBeInTheDocument();
    });
  });

  it("shows an empty checklist state when a report has no report items", async () => {
    supplyControlApi.getSupplyReportDetails.mockResolvedValueOnce({
      data: {
        report: reports[0],
        apartment: apartments[0],
        items: [],
        photos: [],
      },
    });

    render(<ApartmentSupplyControlPage initialSection="reports" />);

    await screen.findByText("מ.ש");
    const reportButtons = screen.getAllByRole("button").filter((button) => button.textContent?.includes("מ.ש"));
    fireEvent.click(reportButtons[0]);

    expect(await screen.findByText("לא דווחו פריטי אספקה בדוח זה")).toBeInTheDocument();
  });

  it("supports pagination with 30 reports per page", async () => {
    const manyReports = Array.from({ length: 31 }, (_, index) => ({
      report_id: `rep-${index + 1}`,
      apartment_id: "apt_ezri",
      reporter_initials: `מדווח ${index + 1}`,
      reported_at: new Date(Date.UTC(2026, 4, 31 - index, 9, 0, 0)).toISOString(),
      general_notes: `הערה ${index + 1}`,
      overall_status: "ok" as const,
    }));

    supplyControlApi.getSupplyReportsByApartment.mockImplementation((_apartmentId: string, options?: { page?: number; limit?: number }) => {
      const page = options?.page || 1;
      return Promise.resolve({
        data: {
          reports: page === 1 ? manyReports.slice(0, 30) : manyReports.slice(30),
          total: manyReports.length,
          page,
          limit: 30,
        },
      });
    });

    render(<ApartmentSupplyControlPage initialSection="reports" />);

    expect(await screen.findByText("עמוד 1 מתוך 2")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /הבא/ }));

    await waitFor(() => {
      expect(supplyControlApi.getSupplyReportsByApartment).toHaveBeenCalledWith("apt_ezri", {
        page: 2,
        limit: 30,
      });
    });
  });

  it("shows an empty state when no apartment is selected", async () => {
    supplyControlApi.getSupplyApartments.mockResolvedValue({ data: [] });
    supplyControlApi.getSupplyReportsByApartment.mockResolvedValue({
      data: {
        reports: [],
        total: 0,
        page: 1,
        limit: 30,
      },
    });

    render(<ApartmentSupplyControlPage initialSection="reports" />);

    expect(await screen.findByText("בחר דירה להצגת דיווחים")).toBeInTheDocument();
  });

  it("shows an empty state when the selected apartment has no reports", async () => {
    supplyControlApi.getSupplyReportsByApartment.mockResolvedValue({
      data: {
        reports: [],
        total: 0,
        page: 1,
        limit: 30,
      },
    });

    render(<ApartmentSupplyControlPage initialSection="reports" />);

    expect(await screen.findByText("לא קיימים דיווחים לדירה זו")).toBeInTheDocument();
  });
});
