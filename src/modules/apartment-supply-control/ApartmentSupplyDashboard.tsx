import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, Building2, CalendarDays, ClipboardCheck, RefreshCw, TriangleAlert } from "lucide-react";
import { Pie, PieChart, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { toast } from "@/hooks/use-toast";
import { supplyControlApi } from "@/modules/apartment-supply-control/api";
import {
  buildSupplyDashboardSummary,
  formatSupplyDashboardMonthLabel,
  getCurrentSupplyDashboardMonth,
  getSupplyDashboardMonthBounds,
  normalizeSupplyDashboardStatus,
  shiftSupplyDashboardMonth,
  SupplyDashboardSummary,
} from "@/modules/apartment-supply-control/dashboard";
import { SupplyApartment, SupplyReport, SupplyStandardItem } from "@/types";

const STATUS_LABELS = {
  ok: "תקין",
  partial: "חלקי",
  missing: "חסר",
  issue: "חריג",
  unknown: "לא ידוע",
} as const;

const STATUS_COLORS = {
  ok: "#1f8a70",
  partial: "#f59e0b",
  missing: "#dc2626",
  issue: "#7c3aed",
  unknown: "#94a3b8",
} as const;

const ISSUE_CATEGORY_COLORS = {
  "מקרר": "#0ea5e9",
  "ציוד ניקוי אקסטרה": "#14b8a6",
  "מצעים": "#f59e0b",
  "חריגים": "#dc2626",
  "ציוד כללי": "#8b5cf6",
  "אחר": "#94a3b8",
} as const;

type ApartmentSupplyDashboardProps = {
  onOpenReport: (reportId: string, standardItems?: SupplyStandardItem[]) => void;
};

function formatSupplyReportDateTime(value?: string): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat("he-IL", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(parsed);
}

function formatApartmentOptionLabel(apartment: SupplyApartment): string {
  return `${apartment.location} — ${apartment.mission}`;
}

function formatPercent(value: number): string {
  return `${value}%`;
}

function IssueCategoryBars({
  items,
}: {
  items: Array<{ category: string; count: number; fill: string }>;
}) {
  const maxCount = Math.max(...items.map((item) => item.count), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const width = item.count > 0 ? Math.max((item.count / maxCount) * 100, 8) : 0;

        return (
          <div key={item.category} className="grid grid-cols-[minmax(0,10rem)_1fr_3rem] items-center gap-3">
            <div className="text-sm font-medium text-foreground">{item.category}</div>
            <div className="h-3 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full transition-[width]"
                style={{
                  width: `${width}%`,
                  backgroundColor: item.fill,
                }}
              />
            </div>
            <div className="text-left text-sm font-medium tabular-nums text-foreground">{item.count}</div>
          </div>
        );
      })}
    </div>
  );
}

function ActivityBars({
  items,
  emptyMessage,
}: {
  items: Array<{ label: string; value: number; fill: string }>;
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const maxValue = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const width = Math.max((item.value / maxValue) * 100, item.value > 0 ? 10 : 0);

        return (
          <div
            key={item.label}
            className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,12rem)_1fr_3rem] sm:items-center sm:gap-3"
          >
            <div className="min-w-0 text-sm font-medium text-foreground">{item.label}</div>
            <div className="h-3 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-[width]"
                style={{
                  width: `${width}%`,
                  backgroundColor: item.fill,
                }}
              />
            </div>
            <div className="text-right text-sm font-medium tabular-nums text-foreground sm:text-left">
              {item.value}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KpiCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string | number;
  subtitle: string;
}) {
  return (
    <Card className="shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      </CardContent>
    </Card>
  );
}

async function loadReportsForApartmentMonth(apartmentId: string, month: string): Promise<SupplyReport[]> {
  const { start, end } = getSupplyDashboardMonthBounds(month);
  const collectedReports: SupplyReport[] = [];
  let page = 1;

  while (true) {
    const result = await supplyControlApi.getSupplyReportsByApartment(apartmentId, { page, limit: 30 });
    if (!result.data) {
      throw new Error(result.error || `טעינת הדיווחים נכשלה עבור ${apartmentId}`);
    }

    const pageReports = result.data.reports;
    if (pageReports.length === 0) {
      break;
    }

    const newestTimestamp = Date.parse(pageReports[0].reported_at);
    const oldestTimestamp = Date.parse(pageReports[pageReports.length - 1].reported_at);

    if (Number.isFinite(newestTimestamp) && newestTimestamp < start) {
      break;
    }

    pageReports.forEach((report) => {
      const reportedAtTimestamp = Date.parse(report.reported_at);
      if (Number.isFinite(reportedAtTimestamp) && reportedAtTimestamp >= start && reportedAtTimestamp < end) {
        collectedReports.push(report);
      }
    });

    if (!Number.isFinite(oldestTimestamp) || oldestTimestamp < start || pageReports.length < 30) {
      break;
    }

    page += 1;
  }

  return collectedReports;
}

export const ApartmentSupplyDashboard: React.FC<ApartmentSupplyDashboardProps> = ({ onOpenReport }) => {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentSupplyDashboardMonth());
  const [summary, setSummary] = useState<SupplyDashboardSummary | null>(null);
  const [standardItemsByApartment, setStandardItemsByApartment] = useState<Record<string, SupplyStandardItem[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadDashboard(month: string) {
    setIsLoading(true);
    setError(null);

    const apartmentsResult = await supplyControlApi.getSupplyApartments();
    if (!apartmentsResult.data) {
      setSummary(null);
      setStandardItemsByApartment({});
      setError(apartmentsResult.error || "טעינת רשימת הדירות נכשלה");
      setIsLoading(false);
      return;
    }

    const apartments = apartmentsResult.data;
    if (apartments.length === 0) {
      setSummary(
        buildSupplyDashboardSummary({
          month,
          apartments: [],
          reportsByApartment: {},
          reportDetailsById: {},
          standardItemsByApartment: {},
        }),
      );
      setStandardItemsByApartment({});
      setIsLoading(false);
      return;
    }

    try {
      const standardItemsEntries = await Promise.all(
        apartments.map(async (apartment) => {
          const result = await supplyControlApi.getSupplyStandardItems(apartment.apartment_id);
          if (!result.data) {
            throw new Error(result.error || `טעינת תקן האספקה נכשלה עבור ${formatApartmentOptionLabel(apartment)}`);
          }

          return [apartment.apartment_id, result.data] as const;
        }),
      );

      const reportsEntries = await Promise.all(
        apartments.map(async (apartment) => {
          const reports = await loadReportsForApartmentMonth(apartment.apartment_id, month);
          return [apartment.apartment_id, reports] as const;
        }),
      );

      const reportIds = reportsEntries.flatMap(([, reports]) => reports.map((report) => report.report_id));
      const detailsResults = await Promise.allSettled(
        reportIds.map(async (reportId) => {
          const result = await supplyControlApi.getSupplyReportDetails(reportId);
          if (!result.data) {
            throw new Error(result.error || `טעינת פרטי הדוח נכשלה: ${reportId}`);
          }

          return result.data;
        }),
      );

      const reportDetailsById = detailsResults.reduce<Record<string, NonNullable<(typeof detailsResults)[number] extends PromiseFulfilledResult<infer T> ? T : never>>>(
        (result, item) => {
          if (item.status === "fulfilled") {
            result[item.value.report.report_id] = item.value;
          }
          return result;
        },
        {},
      );

      const failedDetailsCount = detailsResults.filter((item) => item.status === "rejected").length;
      if (failedDetailsCount > 0) {
        toast({
          variant: "destructive",
          title: "חלק מפרטי הדוחות לא נטענו",
          description: `${failedDetailsCount} דוחות הוצגו בלי פירוט מלא לקטגוריות תקלות.`,
        });
      }

      const standardItemsMap = Object.fromEntries(standardItemsEntries);
      setStandardItemsByApartment(standardItemsMap);
      setSummary(
        buildSupplyDashboardSummary({
          month,
          apartments,
          reportsByApartment: Object.fromEntries(reportsEntries),
          reportDetailsById,
          standardItemsByApartment: standardItemsMap,
        }),
      );
    } catch (loadError) {
      setSummary(null);
      setStandardItemsByApartment({});
      setError(loadError instanceof Error ? loadError.message : "טעינת הדשבורד נכשלה");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadDashboard(selectedMonth);
  }, [selectedMonth]);

  const statusChartData = useMemo(
    () =>
      summary
        ? (Object.keys(summary.statusCounts) as Array<keyof typeof summary.statusCounts>).map((status) => ({
            status,
            label: STATUS_LABELS[status],
            value: summary.statusCounts[status],
            fill: STATUS_COLORS[status],
          }))
        : [],
    [summary],
  );

  const issueCategoryChartData = useMemo(
    () =>
      summary
        ? summary.issueCategoryCounts.map((item) => ({
            ...item,
            fill: ISSUE_CATEGORY_COLORS[item.category as keyof typeof ISSUE_CATEGORY_COLORS] || ISSUE_CATEGORY_COLORS["אחר"],
          }))
        : [],
    [summary],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h3 className="text-xl font-bold text-foreground">דשבורד בקרת אספקה</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            תמונת מצב חודשית על דיווחי אספקה, תקלות, ודירות שדורשות מעקב.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-2 py-2">
            <button
              type="button"
              onClick={() => setSelectedMonth((current) => shiftSupplyDashboardMonth(current, -1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted"
              aria-label="חודש קודם"
            >
              <CalendarDays size={16} />
            </button>
            <input
              type="month"
              value={selectedMonth}
              onChange={(event) => setSelectedMonth(event.target.value)}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
              aria-label="בחירת חודש"
            />
            <button
              type="button"
              onClick={() => setSelectedMonth((current) => shiftSupplyDashboardMonth(current, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground hover:bg-muted"
              aria-label="חודש הבא"
            >
              <CalendarDays size={16} />
            </button>
          </div>

          <button
            type="button"
            onClick={() => void loadDashboard(selectedMonth)}
            className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <RefreshCw size={14} />
            רענון
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        נתונים עבור חודש <span className="font-medium text-foreground">{formatSupplyDashboardMonthLabel(selectedMonth)}</span>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-14 text-center text-sm text-muted-foreground">
          טוען נתוני דשבורד...
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm text-status-danger-text">
          {error}
        </div>
      ) : !summary ? null : summary.activeApartmentsCount === 0 ? (
        <Card className="border-dashed shadow-none">
          <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 p-6 text-center">
            <Building2 className="text-muted-foreground" size={28} />
            <div className="text-lg font-semibold text-foreground">אין עדיין דירות פעילות</div>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              יש להגדיר דירות במסך הגדרות כדי להתחיל לראות דיווחים, תמונות, וסיכום חודשי.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <KpiCard
              title='סה״כ דירות פעילות'
              value={summary.activeApartmentsCount}
              subtitle="כל הדירות הפעילות שהוגדרו במערכת"
            />
            <KpiCard
              title="דירות שדווחו החודש"
              value={summary.apartmentsReportedCount}
              subtitle="מספר דירות עם לפחות דיווח אחד בחודש שנבחר"
            />
            <KpiCard
              title="דירות ללא דיווח החודש"
              value={summary.apartmentsWithoutReports.length}
              subtitle="דורשות השלמה או מעקב תפעולי"
            />
            <KpiCard
              title='סה״כ דיווחים החודש'
              value={summary.totalReports}
              subtitle="כל הדיווחים שנשמרו בחודש שנבחר"
            />
            <KpiCard
              title="דיווחים עם חוסרים / חלקי / חריגים"
              value={summary.reportsWithIssuesCount}
              subtitle="דיווחים שלא הסתיימו כתקינים"
            />
            <KpiCard
              title="אחוז דיווחים תקינים"
              value={formatPercent(summary.okReportsPercentage)}
              subtitle="מתוך כלל הדיווחים של החודש"
            />
          </div>

          {summary.totalReports === 0 ? (
            <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertCircle size={16} />
                    אין דיווחים לחודש שנבחר
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">
                    עדיין לא נשמרו דיווחי בקרת אספקה עבור {formatSupplyDashboardMonthLabel(selectedMonth)}.
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle className="text-base">דירות ללא דיווח החודש</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {summary.apartmentsWithoutReports.map((apartment) => (
                    <div key={apartment.apartment_id} className="rounded-lg border border-border px-4 py-3 text-sm">
                      <div className="font-medium text-foreground">{apartment.location}</div>
                      <div className="mt-1 text-muted-foreground">{apartment.mission}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : (
            <>
              <div className="grid gap-6 xl:grid-cols-2">
                <Card className="shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">התפלגות סטטוסים</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ChartContainer
                      config={statusChartData.reduce<Record<string, { label: string; color: string }>>((result, item) => {
                        result[item.status] = { label: item.label, color: item.fill };
                        return result;
                      }, {})}
                      className="mx-auto aspect-square max-h-[280px]"
                    >
                      <PieChart>
                        <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                        <Pie data={statusChartData} dataKey="value" nameKey="label" innerRadius={64} outerRadius={96}>
                          {statusChartData.map((entry) => (
                            <Cell key={entry.status} fill={entry.fill} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ChartContainer>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {statusChartData.map((item) => (
                        <div key={item.status} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                            <span className="text-foreground">{item.label}</span>
                          </div>
                          <span className="font-medium text-foreground">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">תקלות לפי קטגוריה</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <IssueCategoryBars items={issueCategoryChartData} />
                    <div className="text-xs text-muted-foreground">
                      מוצגים פריטים שסומנו כ"חסר" או "חלקי" בחודש שנבחר.
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <Card className="shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">טופ 3 דירות עם הכי הרבה חוסרים</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ActivityBars
                      items={summary.topIssueApartments.map((entry) => ({
                        label: formatApartmentOptionLabel(entry.apartment),
                        value: entry.issueItems,
                        fill: "#dc2626",
                      }))}
                      emptyMessage="לא נמצאו חוסרים בחודש שנבחר"
                    />
                  </CardContent>
                </Card>

                <Card className="shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">פעילות לפי מדווח</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ActivityBars
                      items={summary.reporterActivity.map((entry) => ({
                        label: entry.reporter,
                        value: entry.reportsCount,
                        fill: "#2563eb",
                      }))}
                      emptyMessage="אין פעילות מדווחים בחודש שנבחר"
                    />
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <Card className="shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">דיווחים אחרונים</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {summary.recentReports.map(({ apartment, report }) => {
                      const normalizedStatus = normalizeSupplyDashboardStatus(report.overall_status);
                      return (
                        <button
                          key={report.report_id}
                          type="button"
                          onClick={() => onOpenReport(report.report_id, standardItemsByApartment[apartment.apartment_id] || [])}
                          className="grid w-full grid-cols-[7rem_minmax(0,1fr)_5rem] gap-3 rounded-xl border border-border px-4 py-3 text-right transition-colors hover:bg-muted/30"
                        >
                          <div className="text-xs text-muted-foreground">{formatSupplyReportDateTime(report.reported_at)}</div>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-foreground">{formatApartmentOptionLabel(apartment)}</div>
                            <div className="mt-1 truncate text-sm text-muted-foreground">
                              {report.reporter_initials || "ללא מדווח"} · {report.general_notes || "ללא הערות"}
                            </div>
                          </div>
                          <div className="justify-self-end rounded-full bg-muted px-3 py-1 text-xs font-medium text-foreground">
                            {STATUS_LABELS[normalizedStatus]}
                          </div>
                        </button>
                      );
                    })}
                  </CardContent>
                </Card>

                <Card className="shadow-none">
                  <CardHeader>
                    <CardTitle className="text-base">דירות ללא דיווח החודש</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {summary.apartmentsWithoutReports.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                        כל הדירות הפעילות דווחו בחודש שנבחר
                      </div>
                    ) : (
                      summary.apartmentsWithoutReports.map((apartment) => (
                        <div key={apartment.apartment_id} className="rounded-lg border border-border px-4 py-3 text-sm">
                          <div className="font-medium text-foreground">{apartment.location}</div>
                          <div className="mt-1 text-muted-foreground">{apartment.mission}</div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card className="shadow-none">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TriangleAlert size={16} />
                    דירות עם תקלות חוזרות או ריבוי חוסרים
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {summary.recurringIssueApartments.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                      לא זוהו דירות עם תקלות חוזרות בחודש שנבחר
                    </div>
                  ) : (
                    summary.recurringIssueApartments.map((entry) => (
                      <div key={entry.apartment.apartment_id} className="flex flex-col gap-3 rounded-xl border border-border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="font-medium text-foreground">{formatApartmentOptionLabel(entry.apartment)}</div>
                          <div className="mt-1 text-sm text-muted-foreground">{entry.apartment.type}</div>
                        </div>
                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="rounded-full bg-muted px-3 py-1 text-foreground">
                            דיווחים לא תקינים: {entry.nonOkReports}
                          </span>
                          <span className="rounded-full bg-muted px-3 py-1 text-foreground">
                            פריטי חסר / חלקי: {entry.issueItems}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
};
