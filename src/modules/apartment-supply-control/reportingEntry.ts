import { SupplyReportingContextParams } from "@/types";

export function parseSupplyReportingEntry(
  locationLike: Pick<Location, "search" | "hash">,
): SupplyReportingContextParams | null {
  const searchParams = new URLSearchParams(locationLike.search);
  const reportToken = searchParams.get("supplyReportToken")?.trim();
  if (reportToken) {
    return { reportToken };
  }

  const apartmentId = searchParams.get("supplyApartmentId")?.trim();
  if (apartmentId) {
    return { apartmentId };
  }

  const hash = (locationLike.hash || "").trim();
  if (!hash.startsWith("#supply-report")) {
    return null;
  }

  const hashValue = hash.replace(/^#supply-report\/?/, "").trim();
  if (!hashValue) {
    return {};
  }

  return hashValue.startsWith("apt_")
    ? { apartmentId: hashValue }
    : { reportToken: hashValue };
}
