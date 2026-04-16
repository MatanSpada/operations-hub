import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { EquipmentPage } from "@/modules/equipment/EquipmentPage";
import { MOCK_DATA } from "@/mockData";

describe("EquipmentPage", () => {
  it("renders the electrical equipment tab without crashing", () => {
    render(<EquipmentPage data={MOCK_DATA} onRefresh={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "ציוד חשמלי" })).toBeInTheDocument();
    expect(screen.getByText("מלאי לפי סוג")).toBeInTheDocument();
    expect(screen.getByText("פריטים מושאלים")).toBeInTheDocument();
  });
});
