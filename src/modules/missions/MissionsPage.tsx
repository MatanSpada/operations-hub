import React, { useMemo, useState } from "react";
import { CampTask, InitialData } from "@/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { DataTable } from "@/components/shared/DataTable";
import { Modal } from "@/components/shared/Modal";
import { SearchInput } from "@/components/shared/SearchInput";
import { DateDisplayInput } from "@/components/shared/DateDisplayInput";
import { api } from "@/api";
import {
  downloadCsv,
  endOfWeekIso,
  formatDateShort,
  formatDateForInput,
  inDateRange,
  startOfWeekIso,
} from "@/utils";
import { ClipboardList, Download, FileText, Plus, Trash2, Users } from "lucide-react";

interface Props {
  data: InitialData;
  onRefresh: () => Promise<void> | void;
}

interface CampTaskForm {
  taskId?: string;
  date: string;
  department: string;
  requesterName: string;
  approvingCommander: string;
  mission: string;
  treatmentSummary: string;
}

function formatMissionError(error?: string): string {
  if (!error) return "הפעולה נכשלה";
  if (error.startsWith("Unknown action: createCampTask")) {
    return "הפריסה הפעילה של Apps Script עדיין לא כוללת את createCampTask. יש לפרוס מחדש את ה-Web App או לעדכן את VITE_GAS_URL לכתובת הפריסה החדשה.";
  }
  const errorMap: Record<string, string> = {
    "Missing requester name": "יש להזין שם מבקש",
    "Missing mission": "יש להזין משימה",
    "Missing camp task ID": "חסר מזהה משימה",
    "Camp task not found": "המשימה לא נמצאה",
  };
  return errorMap[error] ?? error;
}

export const MissionsPage: React.FC<Props> = ({ data, onRefresh }) => {
  const { campTasks, departments } = data;
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CampTask | null>(null);
  const [search, setSearch] = useState("");
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
    approvingCommander: "",
    mission: "",
    treatmentSummary: "",
  });

  const filteredTasks = useMemo(
    () =>
      campTasks
        .filter((task) => inDateRange(task.date, reportRange.from, reportRange.to))
        .filter((task) => {
          if (!search) return true;
          return (
            task.department?.includes(search) ||
            task.requesterName.includes(search) ||
            task.approvingCommander?.includes(search) ||
            task.mission.includes(search) ||
            task.treatmentSummary?.includes(search)
          );
        })
        .sort((a, b) => b.date.localeCompare(a.date)),
    [campTasks, reportRange.from, reportRange.to, search]
  );

  const requesterCount = useMemo(
    () => new Set(filteredTasks.map((task) => task.requesterName).filter(Boolean)).size,
    [filteredTasks]
  );

  const openCreateModal = () => {
    setErrorMessage(null);
    setTaskForm({
      date: formatDateForInput(),
      department: departments[0]?.name ?? "",
      requesterName: "",
      approvingCommander: "",
      mission: "",
      treatmentSummary: "",
    });
    setTaskModalOpen(true);
  };

  const openEditModal = (task: CampTask) => {
    setErrorMessage(null);
    setTaskForm({
      taskId: task.id,
      date: task.date,
      department: task.department || "",
      requesterName: task.requesterName,
      approvingCommander: task.approvingCommander || "",
      mission: task.mission,
      treatmentSummary: task.treatmentSummary || "",
    });
    setTaskModalOpen(true);
  };

  const handleSaveTask = async () => {
    if (!taskForm.requesterName.trim() || !taskForm.mission.trim()) {
      setErrorMessage("יש למלא שם מבקש ומשימה");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const payload = {
      date: taskForm.date,
      department: taskForm.department || undefined,
      requesterName: taskForm.requesterName.trim(),
      approvingCommander: taskForm.approvingCommander.trim() || undefined,
      mission: taskForm.mission.trim(),
      treatmentSummary: taskForm.treatmentSummary.trim() || undefined,
    };

    const result = taskForm.taskId
      ? await api.updateCampTaskDetailed({ taskId: taskForm.taskId, ...payload })
      : await api.createCampTaskDetailed(payload);

    if (!result.data) {
      setErrorMessage(formatMissionError(result.error));
      setIsSubmitting(false);
      return;
    }

    await onRefresh();
    setIsSubmitting(false);
    setTaskModalOpen(false);
  };

  const handleDeleteTask = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    const result = await api.deleteCampTaskDetailed(deleteTarget.id);
    if (!result.data) {
      setErrorMessage(formatMissionError(result.error));
      setIsSubmitting(false);
      return;
    }
    await onRefresh();
    setDeleteTarget(null);
    setIsSubmitting(false);
  };

  const exportReport = () => {
    downloadCsv("missions-report.csv", [
      ["תאריך", "מחלקה", "שם המבקש", "מפקד מאשר", "משימה", "סיכום טיפול"],
      ...filteredTasks.map((task) => [
        formatDateShort(task.date),
        task.department || "",
        task.requesterName,
        task.approvingCommander || "",
        task.mission,
        task.treatmentSummary || "",
      ]),
    ]);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="משימות"
        subtitle="ניהול משימות שטח בה״ד 6, חיפוש, עריכה וייצוא"
        action={
          <button
            onClick={openCreateModal}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
          >
            <Plus size={15} />
            הוספת משימה
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard label="סה״כ משימות" value={campTasks.length} icon={<ClipboardList size={18} />} />
        <SummaryCard label="משימות בטווח שנבחר" value={filteredTasks.length} icon={<FileText size={18} />} />
        <SummaryCard label="מבקשים שונים" value={requesterCount} icon={<Users size={18} />} />
      </div>

      <section className="space-y-4 rounded-lg bg-card p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              משימות שטח
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              לחיצה על שורה פותחת עריכה. הייצוא משקף את הסינון הנוכחי.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <DateDisplayInput
              label="מתאריך"
              value={reportRange.from}
              onChange={(from) => setReportRange((current) => ({ ...current, from }))}
              shortYear
            />
            <DateDisplayInput
              label="עד תאריך"
              value={reportRange.to}
              onChange={(to) => setReportRange((current) => ({ ...current, to }))}
              shortYear
            />
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="חיפוש מבקש, מפקד מאשר, מחלקה או משימה..."
              className="w-full"
            />
            <button
              onClick={exportReport}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-muted"
            >
              <Download size={14} />
              יצוא CSV
            </button>
          </div>
        </div>

        <DataTable
          columns={[
            { key: "date", header: "תאריך", render: (task: CampTask) => formatDateShort(task.date) },
            { key: "department", header: "מחלקה", render: (task: CampTask) => task.department || "—" },
            { key: "requesterName", header: "שם המבקש" },
            { key: "approvingCommander", header: "מפקד מאשר", render: (task: CampTask) => task.approvingCommander || "—" },
            { key: "mission", header: "משימה" },
            { key: "treatmentSummary", header: "סיכום טיפול", render: (task: CampTask) => task.treatmentSummary || "—" },
            {
              key: "actions",
              header: "פעולות",
              render: (task: CampTask) => (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    setDeleteTarget(task);
                    setErrorMessage(null);
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-status-danger-text hover:underline"
                >
                  <Trash2 size={12} />
                  מחק
                </button>
              ),
            },
          ]}
          data={filteredTasks}
          rowKey={(task) => task.id}
          onRowClick={openEditModal}
          emptyMessage="אין משימות בטווח ובסינון שנבחרו"
          minWidthClassName="min-w-[74rem]"
        />
      </section>

      <Modal
        open={taskModalOpen}
        onClose={() => {
          setTaskModalOpen(false);
          setErrorMessage(null);
        }}
        title={taskForm.taskId ? "עריכת משימה" : "הוספת משימת שטח"}
        width="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DateDisplayInput
              label="תאריך"
              value={taskForm.date}
              onChange={(date) => setTaskForm((current) => ({ ...current, date }))}
              shortYear
            />
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">מחלקה</label>
              <select
                value={taskForm.department}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, department: event.target.value }))
                }
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
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">שם המבקש</label>
              <input
                type="text"
                value={taskForm.requesterName}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, requesterName: event.target.value }))
                }
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">מפקד מאשר</label>
              <input
                type="text"
                value={taskForm.approvingCommander}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, approvingCommander: event.target.value }))
                }
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
              <label className="text-sm font-medium">סיכום טיפול (אופציונלי)</label>
              <textarea
                value={taskForm.treatmentSummary}
                onChange={(event) =>
                  setTaskForm((current) => ({ ...current, treatmentSummary: event.target.value }))
                }
                className="min-h-28 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              />
            </div>
          </div>

          {errorMessage && <p className="text-sm text-status-danger-text">{errorMessage}</p>}

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              onClick={handleSaveTask}
              disabled={isSubmitting}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
            >
              {isSubmitting ? "שומר..." : taskForm.taskId ? "שמור שינויים" : "הוסף משימה"}
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

      <Modal
        open={!!deleteTarget}
        onClose={() => {
          setDeleteTarget(null);
          setErrorMessage(null);
        }}
        title={deleteTarget ? `מחיקת משימה של ${deleteTarget.requesterName}` : "מחיקה"}
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            הפעולה תמחק את המשימה מהמערכת ומהייצוא.
          </p>
          {errorMessage && <p className="text-sm text-status-danger-text">{errorMessage}</p>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              onClick={handleDeleteTask}
              disabled={isSubmitting}
              className="w-full rounded-md bg-status-danger-text px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
            >
              {isSubmitting ? "מוחק..." : "אשר מחיקה"}
            </button>
            <button
              onClick={() => {
                setDeleteTarget(null);
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
