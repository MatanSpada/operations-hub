import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ApartmentSupplyFieldReportPage } from "@/modules/apartment-supply-control/ApartmentSupplyFieldReportPage";
import { SupplyApartment, SupplyStandardItem } from "@/types";

const { supplyControlApi } = vi.hoisted(() => ({
  supplyControlApi: {
    getSupplyReportingContext: vi.fn(),
    createSupplyReport: vi.fn(),
    updateSupplyReport: vi.fn(),
    uploadSupplyReportPhotos: vi.fn(),
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
    photo_required: false,
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

class MockFileReader {
  result: string | null = null;
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null = null;
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => void) | null = null;

  readAsDataURL() {
    this.result = "data:image/jpeg;base64,ZmFrZQ==";
    this.onload?.call(this as unknown as FileReader, {} as ProgressEvent<FileReader>);
  }
}

vi.stubGlobal("FileReader", MockFileReader);
vi.stubGlobal("URL", {
  createObjectURL: vi.fn(() => "blob:preview-url"),
  revokeObjectURL: vi.fn(),
});

describe("ApartmentSupplyFieldReportPage", () => {
  beforeEach(() => {
    Object.values(supplyControlApi).forEach((fn) => fn.mockReset());
    supplyControlApi.getSupplyApartments.mockResolvedValue({ data: [] });
    supplyControlApi.getSupplyReportingContext.mockResolvedValue({
      data: {
        apartment,
        standardItems,
        photoRequirements: [
          {
            photo_requirement_id: "photo-req-fridge",
            apartment_id: apartment.apartment_id,
            category: "מקרר",
            required: true,
            active: true,
          },
          {
            photo_requirement_id: "photo-req-cleaning",
            apartment_id: apartment.apartment_id,
            category: "ציוד ניקוי אקסטרה",
            required: false,
            active: true,
          },
          {
            photo_requirement_id: "photo-req-bedding",
            apartment_id: apartment.apartment_id,
            category: "מצעים",
            required: false,
            active: true,
          },
          {
            photo_requirement_id: "photo-req-exceptions",
            apartment_id: apartment.apartment_id,
            category: "חריגים",
            required: false,
            active: true,
          },
        ],
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
    supplyControlApi.uploadSupplyReportPhotos.mockResolvedValue({
      data: [
        {
          photo_id: "photo-1",
          report_id: "rep-123",
          apartment_id: apartment.apartment_id,
          category: "מקרר",
          drive_file_id: "file-1",
          drive_url: "https://drive.google.com/uc?export=view&id=file-1",
          uploaded_at: "2026-05-20T10:00:00.000Z",
        },
      ],
    });
  });

  it("renders apartment details and standard items from the reporting context", async () => {
    render(<ApartmentSupplyFieldReportPage reportToken="demo_ezri" />);

    expect(await screen.findByText("דיווח מילוי אספקה")).toBeInTheDocument();
    expect(screen.getByText("עזרי")).toBeInTheDocument();
    expect(screen.getByText("ורד")).toBeInTheDocument();
    expect(screen.getByText("מיטה")).toBeInTheDocument();
    expect(screen.getAllByText("מקרר").length).toBeGreaterThan(0);
    expect(screen.getAllByText("(חובה)")).toHaveLength(1);
    expect(screen.getByText("ציוד ניקוי אקסטרה")).toBeInTheDocument();
  });

  it("allows submitting a photo-only report when there are no standard items", async () => {
    supplyControlApi.getSupplyReportingContext.mockResolvedValueOnce({
      data: {
        apartment,
        standardItems: [],
        photoRequirements: [
          {
            photo_requirement_id: "photo-req-fridge",
            apartment_id: apartment.apartment_id,
            category: "מקרר",
            required: true,
            active: true,
          },
        ],
      },
    });
    supplyControlApi.createSupplyReport.mockResolvedValueOnce({
      data: {
        report: {
          report_id: "rep-photo-only",
          apartment_id: apartment.apartment_id,
          reporter_initials: "מ.ש",
          reported_at: "2026-05-19T10:00:00.000Z",
          overall_status: "issue",
        },
        items_count: 0,
      },
    });

    render(<ApartmentSupplyFieldReportPage reportToken="demo_ezri" />);

    await screen.findByText("לא הוגדרו פריטי אספקה קבועים לדירה זו. אפשר עדיין לשלוח דיווח עם תמונות והערות.");
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["fake"], "fridge.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText("ראשי תיבות מדווח"), {
      target: { value: "מ.ש" },
    });
    fireEvent.change(screen.getByLabelText("הערות / תקלות שנצפו בדירה"), {
      target: { value: "דיווח עם תמונות בלבד" },
    });
    fireEvent.click(screen.getByRole("button", { name: "שלח דיווח" }));

    await waitFor(() => {
      expect(supplyControlApi.createSupplyReport).toHaveBeenCalledWith({
        apartment_id: "apt_ezri",
        reporter_initials: "מ.ש",
        general_notes: "דיווח עם תמונות בלבד",
        items: [],
      });
    });
  });

  it("requires reporter initials before submit", async () => {
    render(<ApartmentSupplyFieldReportPage reportToken="demo_ezri" />);

    await screen.findByText("מיטה");
    fireEvent.click(screen.getByRole("button", { name: "שלח דיווח" }));

    expect(await screen.findByText("יש למלא ראשי תיבות מדווח")).toBeInTheDocument();
    expect(supplyControlApi.createSupplyReport).not.toHaveBeenCalled();
  });

  it("blocks submit when a required photo category is missing", async () => {
    render(<ApartmentSupplyFieldReportPage reportToken="demo_ezri" />);

    await screen.findByText("מיטה");
    fireEvent.change(screen.getByLabelText("ראשי תיבות מדווח"), {
      target: { value: "מ.ש" },
    });
    fireEvent.click(screen.getByRole("button", { name: "שלח דיווח" }));

    expect(await screen.findByText("יש לצרף תמונות לכל הקטגוריות המסומנות כחובה")).toBeInTheDocument();
    expect(screen.getByText("חובה לצרף תמונה לקטגוריה זו")).toBeInTheDocument();
    expect(supplyControlApi.createSupplyReport).not.toHaveBeenCalled();
  });

  it("reveals actual value when an item is marked partial", async () => {
    render(<ApartmentSupplyFieldReportPage reportToken="demo_ezri" />);

    const bedContainer = (await screen.findByText("מיטה")).closest(".rounded-xl");
    expect(bedContainer).not.toBeNull();
    fireEvent.click(within(bedContainer as HTMLElement).getByRole("button", { name: "חלקי" }));

    expect(await screen.findByText("מה נמצא בפועל?")).toBeInTheDocument();
  });

  it("renders photo upload categories, shows preview, and allows removing a selected image", async () => {
    render(<ApartmentSupplyFieldReportPage reportToken="demo_ezri" />);

    await screen.findByText("תמונות מהדיווח");
    expect(screen.getAllByText("מקרר").length).toBeGreaterThan(0);
    expect(screen.getAllByText("ציוד ניקוי אקסטרה").length).toBeGreaterThan(0);
    expect(screen.getAllByText("מצעים").length).toBeGreaterThan(0);
    expect(screen.getAllByText("חריגים").length).toBeGreaterThan(0);

    const fileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    const file = new File(["fake"], "fridge.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(await screen.findByAltText("מקרר fridge.jpg")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "הסר" }));
    expect(screen.queryByAltText("מקרר fridge.jpg")).not.toBeInTheDocument();
  });

  it("uploads selected photos after creating a report", async () => {
    render(<ApartmentSupplyFieldReportPage reportToken="demo_ezri" />);

    await screen.findByText("מיטה");
    const fileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    const file = new File(["fake"], "fridge.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.change(screen.getByLabelText("ראשי תיבות מדווח"), {
      target: { value: "מ.ש" },
    });
    fireEvent.click(screen.getByRole("button", { name: "שלח דיווח" }));

    await waitFor(() => {
      expect(supplyControlApi.uploadSupplyReportPhotos).toHaveBeenCalledWith({
        report_id: "rep-123",
        apartment_id: "apt_ezri",
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

  it("shows a clear loading state while submitting a new report", async () => {
    let resolveReport:
      | ((value: {
          data: {
            report: {
              report_id: string;
              apartment_id: string;
              reporter_initials: string;
              reported_at: string;
              overall_status: "ok";
            };
            items_count: number;
          };
        }) => void)
      | null = null;

    supplyControlApi.createSupplyReport.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReport = resolve;
        }),
    );

    render(<ApartmentSupplyFieldReportPage reportToken="demo_ezri" />);

    await screen.findByText("מיטה");
    const fileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    const file = new File(["fake"], "fridge.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText("ראשי תיבות מדווח"), {
      target: { value: "מ.ש" },
    });
    fireEvent.click(screen.getByRole("button", { name: "שלח דיווח" }));

    expect(await screen.findByRole("button", { name: "שולח דיווח..." })).toBeDisabled();

    resolveReport?.({
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

    expect(await screen.findByText("הדיווח נשמר בהצלחה")).toBeInTheDocument();
  });

  it("submits the mapped statuses and shows a success state", async () => {
    render(<ApartmentSupplyFieldReportPage reportToken="demo_ezri" />);

    const bedContainer = (await screen.findByText("מיטה")).closest(".rounded-xl");
    expect(bedContainer).not.toBeNull();
    const fileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    const file = new File(["fake"], "fridge.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });

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
    const fileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    const file = new File(["fake"], "fridge.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });

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

  it("uploads newly selected photos after updating an existing report", async () => {
    render(<ApartmentSupplyFieldReportPage reportToken="demo_ezri" />);

    await screen.findByText("מיטה");
    fireEvent.change(screen.getByLabelText("ראשי תיבות מדווח"), {
      target: { value: "מ.ש" },
    });
    const initialFileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    const initialFile = new File(["fake"], "fridge.jpg", { type: "image/jpeg" });
    fireEvent.change(initialFileInput, { target: { files: [initialFile] } });
    fireEvent.click(screen.getByRole("button", { name: "שלח דיווח" }));
    expect(await screen.findByRole("button", { name: "ערוך דיווח" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "ערוך דיווח" }));
    const fileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    const file = new File(["fake"], "extra.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "עדכן דיווח" }));

    await waitFor(() => {
      expect(supplyControlApi.updateSupplyReport).toHaveBeenCalled();
      expect(supplyControlApi.uploadSupplyReportPhotos).toHaveBeenLastCalledWith({
        report_id: "rep-123",
        apartment_id: "apt_ezri",
        photos: [
          {
            category: "מקרר",
            filename: "extra.jpg",
            mime_type: "image/jpeg",
            base64_data: "ZmFrZQ==",
            notes: "",
          },
        ],
      });
    });
  });

  it("shows a clear loading state while updating an existing report", async () => {
    render(<ApartmentSupplyFieldReportPage reportToken="demo_ezri" />);

    await screen.findByText("מיטה");
    const fileInput = document.querySelectorAll('input[type="file"]')[0] as HTMLInputElement;
    const file = new File(["fake"], "fridge.jpg", { type: "image/jpeg" });
    fireEvent.change(fileInput, { target: { files: [file] } });
    fireEvent.change(screen.getByLabelText("ראשי תיבות מדווח"), {
      target: { value: "מ.ש" },
    });
    fireEvent.click(screen.getByRole("button", { name: "שלח דיווח" }));
    expect(await screen.findByRole("button", { name: "ערוך דיווח" })).toBeInTheDocument();

    let resolveUpdate:
      | ((value: {
          data: {
            report: {
              report_id: string;
              apartment_id: string;
              reporter_initials: string;
              reported_at: string;
              overall_status: "ok";
            };
            items_count: number;
          };
        }) => void)
      | null = null;

    supplyControlApi.updateSupplyReport.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveUpdate = resolve;
        }),
    );

    fireEvent.click(screen.getByRole("button", { name: "ערוך דיווח" }));
    fireEvent.click(screen.getByRole("button", { name: "עדכן דיווח" }));

    expect(await screen.findByRole("button", { name: "מעדכן דיווח..." })).toBeDisabled();

    resolveUpdate?.({
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

    expect(await screen.findByText("הדיווח נשמר בהצלחה")).toBeInTheDocument();
  });
});
