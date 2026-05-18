import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import Index from "@/pages/Index";
import { MOCK_DATA } from "@/mockData";

vi.mock("@/api", () => ({
  fetchInitialData: vi.fn(),
}));

describe("Apartment supply control navigation", () => {
  it("adds the module to the sidebar and opens its default dashboard section", async () => {
    const { fetchInitialData } = await import("@/api");
    vi.mocked(fetchInitialData).mockResolvedValue(MOCK_DATA);

    render(<Index />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "לוח בקרה" })).toBeInTheDocument();
    });

    const navigation = screen.getByRole("navigation");
    const navButtons = within(navigation).getAllByRole("button");
    const navLabels = navButtons.map((button) => button.textContent?.trim() ?? "");
    const settingsIndex = navLabels.indexOf("ניהול נתונים");
    const apartmentSupplyIndex = navLabels.indexOf("בקרת אספקת דירות");

    expect(apartmentSupplyIndex).toBe(settingsIndex + 1);

    fireEvent.click(within(navigation).getByRole("button", { name: "בקרת אספקת דירות" }));

    await waitFor(() => {
      expect(screen.getAllByRole("heading", { name: "בקרת אספקת דירות" })).toHaveLength(2);
    });
    expect(screen.getByRole("tab", { name: "דשבורד" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "דיווחים" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "הגדרות" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "דשבורד", selected: true })).toBeInTheDocument();
    expect(screen.getByText("דשבורד בקרת אספקה")).toBeInTheDocument();
    expect(screen.queryByText("דיווחים לפי דירה")).not.toBeInTheDocument();
    expect(screen.queryByText("הגדרות דירות ומלאי קבוע")).not.toBeInTheDocument();
  });
});
