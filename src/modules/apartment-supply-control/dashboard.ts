import {
  SupplyApartment,
  SupplyOverallStatus,
  SupplyReport,
  SupplyReportDetails,
  SupplyStandardItem,
} from "@/types";

export type SupplyDashboardStatusKey = "ok" | "partial" | "missing" | "issue" | "unknown";

export type SupplyDashboardReportRow = {
  apartment: SupplyApartment;
  report: SupplyReport;
};

export type SupplyDashboardRecurringApartment = {
  apartment: SupplyApartment;
  nonOkReports: number;
  issueItems: number;
};

export type SupplyDashboardSummary = {
  month: string;
  activeApartmentsCount: number;
  apartmentsReportedCount: number;
  apartmentsWithoutReports: SupplyApartment[];
  totalReports: number;
  reportsWithIssuesCount: number;
  okReportsPercentage: number;
  statusCounts: Record<SupplyDashboardStatusKey, number>;
  issueCategoryCounts: Array<{ category: string; count: number }>;
  recentReports: SupplyDashboardReportRow[];
  recurringIssueApartments: SupplyDashboardRecurringApartment[];
};

const ISSUE_CATEGORY_ORDER = ["מקרר", "ציוד ניקוי אקסטרה", "מצעים", "חריגים", "ציוד כללי", "אחר"] as const;

export function getCurrentSupplyDashboardMonth(now = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

export function shiftSupplyDashboardMonth(month: string, delta: number): string {
  const [yearPart, monthPart] = month.split("-");
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;
  const date = new Date(year, monthIndex + delta, 1);
  return getCurrentSupplyDashboardMonth(date);
}

export function formatSupplyDashboardMonthLabel(month: string): string {
  const [yearPart, monthPart] = month.split("-");
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;
  const date = new Date(year, monthIndex, 1);
  if (Number.isNaN(date.getTime())) {
    return month;
  }

  return new Intl.DateTimeFormat("he-IL", {
    month: "long",
    year: "numeric",
  }).format(date);
}

export function getSupplyDashboardMonthBounds(month: string): { start: number; end: number } {
  const [yearPart, monthPart] = month.split("-");
  const year = Number(yearPart);
  const monthIndex = Number(monthPart) - 1;
  const start = new Date(year, monthIndex, 1).getTime();
  const end = new Date(year, monthIndex + 1, 1).getTime();
  return { start, end };
}

export function normalizeSupplyDashboardStatus(status?: SupplyOverallStatus | string): SupplyDashboardStatusKey {
  if (status === "ok" || status === "partial" || status === "missing" || status === "issue") {
    return status;
  }
  return "unknown";
}

export function isSupplyTimestampInMonth(timestamp: number, month: string): boolean {
  const { start, end } = getSupplyDashboardMonthBounds(month);
  return timestamp >= start && timestamp < end;
}

function toTimestamp(value?: string): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function normalizeIssueCategory(value?: string): string {
  if (!value) return "אחר";
  return ISSUE_CATEGORY_ORDER.includes(value as (typeof ISSUE_CATEGORY_ORDER)[number]) ? value : "אחר";
}

export function buildSupplyDashboardSummary(params: {
  month: string;
  apartments: SupplyApartment[];
  reportsByApartment: Record<string, SupplyReport[]>;
  reportDetailsById: Record<string, SupplyReportDetails>;
  standardItemsByApartment: Record<string, SupplyStandardItem[]>;
}): SupplyDashboardSummary {
  const { month, apartments, reportsByApartment, reportDetailsById, standardItemsByApartment } = params;
  const statusCounts: Record<SupplyDashboardStatusKey, number> = {
    ok: 0,
    partial: 0,
    missing: 0,
    issue: 0,
    unknown: 0,
  };
  const issueCategoryCounts = ISSUE_CATEGORY_ORDER.reduce<Record<string, number>>((result, category) => {
    result[category] = 0;
    return result;
  }, {});

  const apartmentById = apartments.reduce<Record<string, SupplyApartment>>((result, apartment) => {
    result[apartment.apartment_id] = apartment;
    return result;
  }, {});

  const monthlyReports: SupplyDashboardReportRow[] = [];
  const apartmentsWithReports = new Set<string>();
  const recurringByApartment = new Map<string, SupplyDashboardRecurringApartment>();

  Object.entries(reportsByApartment).forEach(([apartmentId, reports]) => {
    const apartment = apartmentById[apartmentId];
    if (!apartment) return;

    reports.forEach((report) => {
      const reportedAtTimestamp = toTimestamp(report.reported_at);
      if (!isSupplyTimestampInMonth(reportedAtTimestamp, month)) {
        return;
      }

      apartmentsWithReports.add(apartmentId);
      monthlyReports.push({ apartment, report });

      const normalizedStatus = normalizeSupplyDashboardStatus(report.overall_status);
      statusCounts[normalizedStatus] += 1;

      const recurring = recurringByApartment.get(apartmentId) || {
        apartment,
        nonOkReports: 0,
        issueItems: 0,
      };

      if (normalizedStatus === "partial" || normalizedStatus === "missing" || normalizedStatus === "issue") {
        recurring.nonOkReports += 1;
      }

      const details = reportDetailsById[report.report_id];
      if (details) {
        const categoryByStandardItemId = (standardItemsByApartment[apartmentId] || []).reduce<Record<string, string>>(
          (result, item) => {
            result[item.standard_item_id] = item.category;
            return result;
          },
          {},
        );

        details.items.forEach((item) => {
          if (item.reported_status !== "missing" && item.reported_status !== "partial") {
            return;
          }

          const category = normalizeIssueCategory(
            item.category || (item.standard_item_id ? categoryByStandardItemId[item.standard_item_id] : undefined),
          );
          issueCategoryCounts[category] += 1;
          recurring.issueItems += 1;
        });
      }

      recurringByApartment.set(apartmentId, recurring);
    });
  });

  const totalReports = monthlyReports.length;
  const okReportsPercentage = totalReports > 0 ? Math.round((statusCounts.ok / totalReports) * 100) : 0;
  const reportsWithIssuesCount = statusCounts.partial + statusCounts.missing + statusCounts.issue;

  return {
    month,
    activeApartmentsCount: apartments.length,
    apartmentsReportedCount: apartmentsWithReports.size,
    apartmentsWithoutReports: apartments.filter((apartment) => !apartmentsWithReports.has(apartment.apartment_id)),
    totalReports,
    reportsWithIssuesCount,
    okReportsPercentage,
    statusCounts,
    issueCategoryCounts: ISSUE_CATEGORY_ORDER.map((category) => ({
      category,
      count: issueCategoryCounts[category],
    })),
    recentReports: monthlyReports
      .slice()
      .sort((left, right) => toTimestamp(right.report.reported_at) - toTimestamp(left.report.reported_at))
      .slice(0, 8),
    recurringIssueApartments: [...recurringByApartment.values()]
      .filter((entry) => entry.nonOkReports > 1 || entry.issueItems > 0)
      .sort((left, right) => {
        if (right.issueItems !== left.issueItems) return right.issueItems - left.issueItems;
        if (right.nonOkReports !== left.nonOkReports) return right.nonOkReports - left.nonOkReports;
        return left.apartment.location.localeCompare(right.apartment.location, "he");
      })
      .slice(0, 6),
  };
}
