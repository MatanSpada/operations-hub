import React, { useMemo, useState } from "react";
import { CampTask, InitialData } from "@/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { DataTable } from "@/components/shared/DataTable";
import { Modal } from "@/components/shared/Modal";
import { api } from "@/api";
import {
  downloadCsv,
  endOfWeekIso,
  formatDate,
  formatDateForInput,
  inDateRange,
  startOfWeekIso,
} from "@/utils";
import { ClipboardList, Download, FileText, Plus, Users } from "lucide-react";

interface Props {
  data: InitialData;
  onRefresh: () => void;
}

interface CampTaskForm {
  date: string;
  department: string;
  requesterName: string;
  mission: string;
  treatmentSummary: string;
}

function formatMissionError(error?: string): string {
  if (!error) return "הפעולה נכשלה";
  if (error.startsWith("Unknown action: createCampTask")) {
    return "הפריסה הפעילה של Apps Script עדיין לא כוללת את createCampTask. יש לפרוס מחדש את ה-Web App או לעדכן את VITE_GAS_URL לכתובת הפריסה החדשה.";
  }
  if (error === "Missing requester name") {
    return "יש להזין שם מבקש";
  }
  if (error === "Missing mission") {
    return "יש להזין משימה";
  }
  if (error === "Missing treatment summary") {
    return "יש להזין סיכום טיפול";
  }
  return error;
}

export const MissionsPage: React.FC<Props> = ({ data, onRefresh }) => {
  const { campTasks, departments } = data;
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [reportRange, setReportRange] = useState({
    from: startOfWeekIso(),
    to: endOfWeekIso(),
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState<CampTaskForm>({
    date: formatDateForInput(),
    department: departments[0]?.name ?? "",
    requesterName: "",
    mission: "",
    treatmentSummary: "",
  });

  const weeklyCampTasks = useMemo(
    () =>
      campTasks
        .filter((task) => inDateRange(task.date, reportRange.from, reportRange.to))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [campTasks, reportRange.from, reportRange.to]
  );

  const requesterCount = useMemo(
    () => new Set(campTasks.map((task) => task.requesterName).filter(Boolean)).size,
    [campTasks]
  );

  const reportRows = useMemo(
    () =>
      weeklyCampTasks.map((task) => ({
        id: task.id,
        date: formatDate(task.date),
        requester: [task.department, task.requesterName].filter(Boolean).join(" / "),
        mission: task.mission,
        treatmentSummary: task.treatmentSummary,
      })),
    [weeklyCampTasks]
  );

  const handleCreateTask = async () => {
    if (!taskForm.requesterName.trim() || !taskForm.mission.trim() || !taskForm.treatmentSummary.trim()) {
      setErrorMessage("יש למלא שם מבקש, משימה וסיכום טיפול");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    const result = await api.createCampTaskDetailed({
      date: taskForm.date,
      department: taskForm.department || undefined,
      requesterName: taskForm.requesterName.trim(),
      mission: taskForm.mission.trim(),
      treatmentSummary: taskForm.treatmentSummary.trim(),
    });

    if (!result.data) {
      setErrorMessage(formatMissionError(result.error));
      setIsSubmitting(false);
      return;
    }

    await onRefresh();
    setIsSubmitting(false);
    setTaskModalOpen(false);
    setTaskForm({
      date: formatDateForInput(),
      department: departments[0]?.name ?? "",
      requesterName: "",
      mission: "",
      treatmentSummary: "",
    });
  };

  const exportReport = () => {
    downloadCsv("missions-report.csv", [
      ["תאריך", "מחלקה / שם המבקש", "משימה", "סיכום טיפול"],
      ...reportRows.map((row) => [row.date, row.requester, row.mission, row.treatmentSummary]),
    ]);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="משימות"
        subtitle="ניהול משימות שטח בה״ד 6 ודוח מבקשים"
        action={
          <button
            onClick={() => {
              setTaskModalOpen(true);
              setErrorMessage(null);
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
          >
            <Plus size={15} />
            הוספת משימה
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard label="סה״כ משימות" value={campTasks.length} icon={<ClipboardList size={18} />} />
        <SummaryCard label="משימות בטווח שנבחר" value={weeklyCampTasks.length} icon={<FileText size={18} />} />
        <SummaryCard label="מבקשים שונים" value={requesterCount} icon={<Users size={18} />} />
      </div>

      <section>
        <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              דוח משימות שטח בה״ד 6
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              סינון לפי טווח תאריכים ויצוא CSV עבור משימות השטח
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">מתאריך</label>
              <input
                type="date"
                value={reportRange.from}
                onChange={(event) => setReportRange((current) => ({ ...current, from: event.target.value }))}
                className="h-10 rounded-md border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">עד תאריך</label>
              <input
                type="date"
                value={reportRange.to}
                onChange={(event) => setReportRange((current) => ({ ...current, to: event.target.value }))}
                className="h-10 rounded-md border border-border bg-card px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <button
              onClick={exportReport}
              className="mt-auto inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Download size={14} />
              יצוא CSV
            </button>
          </div>
        </div>

        <DataTable
          columns={[
            { key: "date", header: "תאריך" },
            { key: "requester", header: "מחלקה / שם המבקש" },
            { key: "mission", header: "משימה" },
            { key: "treatmentSummary", header: "סיכום טיפול" },
          ]}
          data={reportRows}
          rowKey={(row) => row.id}
          emptyMessage="אין משימות בטווח התאריכים שנבחר"
          minWidthClassName="min-w-[52rem]"
        />
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          כל משימות השטח
        </h3>
        <DataTable
          columns={[
            { key: "date", header: "תאריך", render: (task: CampTask) => formatDate(task.date) },
            { key: "department", header: "מחלקה", render: (task: CampTask) => task.department || "—" },
            { key: "requesterName", header: "שם המבקש" },
            { key: "mission", header: "משימה" },
            { key: "treatmentSummary", header: "סיכום טיפול" },
          ]}
          data={[...campTasks].sort((a, b) => b.date.localeCompare(a.date))}
          rowKey={(task) => task.id}
          emptyMessage="אין משימות שטח רשומות"
          minWidthClassName="min-w-[56rem]"
        />
      </section>

      <Modal
        open={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setErrorMessage(null);
        }}
        title="הוספת משימת שטח"
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">תאריך</label>
              <input
                type="date"
                value={taskForm.date}
                onChange={(event) => setTaskForm((current) => ({ ...current, date: event.target.value }))}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">מחלקה</label>
              <select
                value={taskForm.department}
                onChange={(event) => setTaskForm((current) => ({ ...current, department: event.target.value }))}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              >
                <option value="">בחר מחלקה</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.name}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-sm font-medium">שם המבקש</label>
              <input
                type="text"
                value={taskForm.requesterName}
                onChange={(event) => setTaskForm((current) => ({ ...current, requesterName: event.target.value }))}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-sm font-medium">משימה</label>
              <input
                type="text"
                value={taskForm.mission}
                onChange={(event) => setTaskForm((current) => ({ ...current, mission: event.target.value }))}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-sm font-medium">סיכום טיפול</label>
              <textarea
                value={taskForm.treatmentSummary}
                onChange={(event) => setTaskForm((current) => ({ ...current, treatmentSummary: event.target.value }))}
                className="min-h-28 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              />
            </div>
          </div>
          {errorMessage && <p className="text-sm text-status-danger-text">{errorMessage}</p>}
          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row">
            <button
              onClick={handleCreateTask}
              disabled={isSubmitting}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
            >
              {isSubmitting ? "שומר..." : "שמור משימה"}
            </button>
            <button
              onClick={() => {
                setTaskModalOpen(false);
                setErrorMessage(null);
              }}
              className="w-full rounded-md px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted sm:w-auto"
            >
              ביטול
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
