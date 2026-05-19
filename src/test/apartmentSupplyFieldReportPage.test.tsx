import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ApartmentSupplyFieldReportPage } from "@/modules/apartment-supply-control/ApartmentSupplyFieldReportPage";
import { SupplyApartment, SupplyStandardItem } from "@/types";

const { supplyControlApi } = vi.hoisted(() => ({
  supplyControlApi: {
    getSupplyReportingContext: vi.fn(),
    createSupplyReport: vi.fn(),
    updateSupplyReport: vi.fn(),
    getSupplyApartments: vi.fn(),
  },
}));

vi.mock("@/modules/apartment-supply-control/api", () => ({
  supplyControlApi,
}));

const apartment: SupplyApartment = {
  apartment_id: "apt_ezri",
  location: "עזרי",
  mission: "ורד",
  type: "דירה",
  notes: "תמי 4 תקול",
  report_token: "demo_ezri",
  active: true,
};

const standardItems: SupplyStandardItem[] = [
  {
    standard_item_id: "std-bed",
    apartment_id: "apt_ezri",
    category: "מצעים",
    item_name: "מיטה",
    required_value: "קיים",
    required_type: "exists",
    photo_required: true,
    active: true,
  },
  {
    standard_item_id: "std-fridge",
    apartment_id: "apt_ezri",
    category: "מקרר",
    item_name: "מקרר",
    required_value: "קיים",
    required_type: "exists",
    photo_required: true,
    active: true,
  },
];

describe("ApartmentSupplyFieldReportPage", () => {
  beforeEach(() => {
    Object.values(supplyControlApi).forEach((fn) => fn.mockReset());
    supplyControlApi.getSupplyApartments.mockResolvedValue({ data: [] });
    supplyControlApi.getSupplyReportingContext.mockResolvedValue({
      data: {
        apartment,
        standardItems,
      },
    });
    supplyControlApi.createSupplyReport.mockResolvedValue({
      data: {
        report: {
          report_id: "rep-123",
          apartment_id: apartment.apartment_id,
          reporter_initials: "מ.ש",
          reported_at: "2026-05-19T10:00:00.000Z",
          overall_status: "partial",
        },
        items_count: 2,
      },
    });
    supplyControlApi.updateSupplyReport.mockResolvedValue({
      data: {
        report: {
          report_id: "rep-123",
          apartment_id: apartment.apartment_id,
          reporter_initials: "מ.ש",
          reported_at: "2026-05-19T10:00:00.000Z",
          overall_status: "ok",
        },
        items_count: 2,
      },
    });
  });

  it("renders apartment details and standard items from the reporting context", async () => {
    render(<ApartmentSupplyFieldReportPage reportToken="demo_ezri" />);

    expect(await screen.findByText("דיווח מילוי אספקה")).toBeInTheDocument();
    expect(screen.getByText("עזרי")).toBeInTheDocument();
    expect(screen.getByText("ורד")).toBeInTheDocument();
    expect(screen.getByText("מיטה")).toBeInTheDocument();
    expect(screen.getAllByText("מקרר").length).toBeGreaterThan(0);
  });

  it("requires reporter initials before submit", async () => {
    render(<ApartmentSupplyFieldReportPage reportToken="demo_ezri" />);

    await screen.findByText("מיטה");
    fireEvent.click(screen.getByRole("button", { name: "שלח דיווח" }));

    expect(await screen.findByText("יש למלא ראשי תיבות מדווח")).toBeInTheDocument();
    expect(supplyControlApi.createSupplyReport).not.toHaveBeenCalled();
  });

  it("reveals actual value when an item is marked partial", async () => {
    render(<ApartmentSupplyFieldReportPage reportToken="demo_ezri" />);

    const bedContainer = (await screen.findByText("מיטה")).closest(".rounded-xl");
    expect(bedContainer).not.toBeNull();
    fireEvent.click(within(bedContainer as HTMLElement).getByRole("button", { name: "חלקי" }));

    expect(await screen.findByText("מה נמצא בפועל?")).toBeInTheDocument();
  });

  it("submits the mapped statuses and shows a success state", async () => {
    render(<ApartmentSupplyFieldReportPage reportToken="demo_ezri" />);

    const bedContainer = (await screen.findByText("מיטה")).closest(".rounded-xl");
    expect(bedContainer).not.toBeNull();

    fireEvent.change(screen.getByLabelText("ראשי תיבות מדווח"), {
      target: { value: "מ.ש" },
    });
    fireEvent.click(within(bedContainer as HTMLElement).getByRole("button", { name: "חלקי" }));
    fireEvent.change(screen.getByLabelText("מה נמצא בפועל?"), {
      target: { value: "1 מיטה" },
    });
    fireEvent.change(screen.getByLabelText("הערה לפריט"), {
      target: { value: "חסרה מיטה נוספת" },
    });
    fireEvent.change(screen.getByLabelText("הערות / תקלות שנצפו בדירה"), {
      target: { value: "יש לבדוק גם את תמי 4" },
    });

    fireEvent.click(screen.getByRole("button", { name: "שלח דיווח" }));

    await waitFor(() => {
      expect(supplyControlApi.createSupplyReport).toHaveBeenCalledWith({
        apartment_id: "apt_ezri",
        reporter_initials: "מ.ש",
        general_notes: "יש לבדוק גם את תמי 4",
        items: [
          {
            standard_item_id: "std-bed",
            item_name: "מיטה",
            required_value: "קיים",
            reported_status: "partial",
            actual_value: "1 מיטה",
            item_notes: "חסרה מיטה נוספת",
          },
          {
            standard_item_id: "std-fridge",
            item_name: "מקרר",
            required_value: "קיים",
            reported_status: "ok",
            actual_value: "",
            item_notes: "",
          },
        ],
      });
    });

    expect(await screen.findByText("הדיווח נשמר בהצלחה")).toBeInTheDocument();
    expect(screen.getByText("ערוך דיווח")).toBeInTheDocument();
    expect(screen.queryByText("rep-123")).not.toBeInTheDocument();
    expect(screen.queryByText("מספר דיווח")).not.toBeInTheDocument();
    expect(screen.queryByText("סטטוס")).not.toBeInTheDocument();
    expect(screen.queryByText("פריטים שנשמרו")).not.toBeInTheDocument();
  });

  it("returns to the form with preserved values and updates the same report", async () => {
    render(<ApartmentSupplyFieldReportPage reportToken="demo_ezri" />);

    const bedContainer = (await screen.findByText("מיטה")).closest(".rounded-xl");
    expect(bedContainer).not.toBeNull();

    fireEvent.change(screen.getByLabelText("ראשי תיבות מדווח"), {
      target: { value: "מ.ש" },
    });
    fireEvent.click(within(bedContainer as HTMLElement).getByRole("button", { name: "חלקי" }));
    fireEvent.change(screen.getByLabelText("מה נמצא בפועל?"), {
      target: { value: "1 מיטה" },
    });
    fireEvent.change(screen.getByLabelText("הערה לפריט"), {
      target: { value: "חסרה מיטה נוספת" },
    });
    fireEvent.change(screen.getByLabelText("הערות / תקלות שנצפו בדירה"), {
      target: { value: "יש לבדוק גם את תמי 4" },
    });

    fireEvent.click(screen.getByRole("button", { name: "שלח דיווח" }));
    expect(await screen.findByRole("button", { name: "ערוך דיווח" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "ערוך דיווח" }));

    expect(await screen.findByText("עריכת דיווח שנשלח")).toBeInTheDocument();
    expect((screen.getByLabelText("ראשי תיבות מדווח") as HTMLInputElement).value).toBe("מ.ש");
    expect((screen.getByLabelText("מה נמצא בפועל?") as HTMLInputElement).value).toBe("1 מיטה");
    expect((screen.getByLabelText("הערה לפריט") as HTMLTextAreaElement).value).toBe("חסרה מיטה נוספת");
    expect((screen.getByLabelText("הערות / תקלות שנצפו בדירה") as HTMLTextAreaElement).value).toBe("יש לבדוק גם את תמי 4");
    expect(screen.getByRole("button", { name: "עדכן דיווח" })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("הערות / תקלות שנצפו בדירה"), {
      target: { value: "עודכן אחרי בדיקה חוזרת" },
    });
    fireEvent.click(screen.getByRole("button", { name: "עדכן דיווח" }));

    await waitFor(() => {
      expect(supplyControlApi.updateSupplyReport).toHaveBeenCalledWith({
        report_id: "rep-123",
        apartment_id: "apt_ezri",
        reporter_initials: "מ.ש",
        general_notes: "עודכן אחרי בדיקה חוזרת",
        items: [
          {
            standard_item_id: "std-bed",
            item_name: "מיטה",
            required_value: "קיים",
            reported_status: "partial",
            actual_value: "1 מיטה",
            item_notes: "חסרה מיטה נוספת",
          },
          {
            standard_item_id: "std-fridge",
            item_name: "מקרר",
            required_value: "קיים",
            reported_status: "ok",
            actual_value: "",
            item_notes: "",
          },
        ],
      });
    });

    expect(supplyControlApi.createSupplyReport).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("הדיווח נשמר בהצלחה")).toBeInTheDocument();
  });
});
