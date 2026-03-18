import React, { useMemo, useState } from "react";
import { CampTask, InitialData, Vehicle, VehicleTask } from "@/types";
import { Badge } from "@/components/shared/Badge";
import { DataTable } from "@/components/shared/DataTable";
import { Modal } from "@/components/shared/Modal";
import { PageHeader } from "@/components/shared/PageHeader";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { api } from "@/api";
import {
  computeTaskWorkHours,
  downloadCsv,
  endOfWeekIso,
  formatDate,
  formatDateForInput,
  formatDateTime,
  formatHours,
  inDateRange,
  startOfWeekIso,
  vehicleMissionTypeLabel,
  vehicleMissionTypeOptions,
  vehicleStatusLabel,
  vehicleStatusVariant,
} from "@/utils";
import {
  CheckCircle,
  ClipboardList,
  Download,
  FileText,
  Plus,
  RotateCcw,
  Truck,
  Wrench,
} from "lucide-react";

interface Props {
  data: InitialData;
  onRefresh: () => void;
}

interface VehicleMissionForm {
  driver: string;
  departureLocation: string;
  taskPurpose: string;
  missionType: VehicleTask["missionType"];
  requesterName: string;
  requestingDepartment: string;
  departureTime: string;
}

interface VehicleReturnForm {
  workHours: string;
  treatmentSummary: string;
}

interface CampTaskForm {
  date: string;
  department: string;
  requesterName: string;
  mission: string;
  treatmentSummary: string;
}

function currentMissionHours(departureTime?: string): string {
  if (!departureTime) return "";
  const hours = computeTaskWorkHours({
    departureTime,
    returnTime: new Date().toISOString(),
    workHours: undefined,
  });
  return hours !== undefined ? String(hours) : "";
}

function formatVehicleError(error?: string): string {
  if (!error) return "הפעולה נכשלה";
  const map: Record<string, string> = {
    "Missing requester name": "יש להזין שם מבקש",
    "Missing mission": "יש להזין משימה",
    "Missing treatment summary": "יש להזין סיכום טיפול",
  };
  return map[error] ?? error;
}

export const VehiclesPage: React.FC<Props> = ({ data, onRefresh }) => {
  const { vehicles, vehicleTasks, campTasks, departments } = data;
  const [checkoutModal, setCheckoutModal] = useState<Vehicle | null>(null);
  const [returnModal, setReturnModal] = useState<Vehicle | null>(null);
  const [campTaskModalOpen, setCampTaskModalOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportRange, setReportRange] = useState({
    from: startOfWeekIso(),
    to: endOfWeekIso(),
  });
  const [missionForm, setMissionForm] = useState<VehicleMissionForm>({
    driver: "",
    departureLocation: "",
    taskPurpose: "",
    missionType: "other",
    requesterName: "",
    requestingDepartment: departments[0]?.name ?? "",
    departureTime: new Date().toISOString().slice(0, 16),
  });
  const [returnForm, setReturnForm] = useState<VehicleReturnForm>({
    workHours: "",
    treatmentSummary: "",
  });
  const [campTaskForm, setCampTaskForm] = useState<CampTaskForm>({
    date: formatDateForInput(),
    department: departments[0]?.name ?? "",
    requesterName: "",
    mission: "",
    treatmentSummary: "",
  });

  const available = vehicles.filter((vehicle) => vehicle.status === "available");
  const inUse = vehicles.filter((vehicle) => vehicle.status === "in_use");
  const maintenance = vehicles.filter((vehicle) => vehicle.status === "maintenance");

  const weeklyVehicleTasks = useMemo(
    () =>
      vehicleTasks
        .filter((task) => inDateRange(task.departureTime, reportRange.from, reportRange.to))
        .sort((a, b) => b.departureTime.localeCompare(a.departureTime)),
    [reportRange.from, reportRange.to, vehicleTasks]
  );

  const weeklyCampTasks = useMemo(
    () =>
      campTasks
        .filter((task) => inDateRange(task.date, reportRange.from, reportRange.to))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [campTasks, reportRange.from, reportRange.to]
  );

  const vehicleReportRows = useMemo(
    () =>
      weeklyVehicleTasks.map((task) => ({
        id: task.id,
        date: formatDate(task.departureTime),
        location: task.departureLocation || "—",
        workHours: formatHours(computeTaskWorkHours(task)),
        vehicleType: task.vehicleType || "—",
        missionType: vehicleMissionTypeLabel(task.missionType),
        treatmentSummary: task.treatmentSummary || "—",
      })),
    [weeklyVehicleTasks]
  );

  const campReportRows = useMemo(
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

  const recentVehicleTasks = useMemo(
    () =>
      [...vehicleTasks]
        .sort((a, b) => b.departureTime.localeCompare(a.departureTime))
        .slice(0, 8),
    [vehicleTasks]
  );

  const resetMissionModal = () => {
    setCheckoutModal(null);
    setActionError(null);
    setMissionForm({
      driver: "",
      departureLocation: "",
      taskPurpose: "",
      missionType: "other",
      requesterName: "",
      requestingDepartment: departments[0]?.name ?? "",
      departureTime: new Date().toISOString().slice(0, 16),
    });
  };

  const openReturnModal = (vehicle: Vehicle) => {
    setReturnModal(vehicle);
    setActionError(null);
    setReturnForm({
      workHours: currentMissionHours(vehicle.departureTime),
      treatmentSummary: "",
    });
  };

  const resetReturnModal = () => {
    setReturnModal(null);
    setActionError(null);
    setReturnForm({ workHours: "", treatmentSummary: "" });
  };

  const handleCheckout = async () => {
    if (!checkoutModal) return;
    if (!missionForm.driver.trim() || !missionForm.departureLocation.trim() || !missionForm.taskPurpose.trim()) {
      setActionError("יש למלא נהג, נקודת יציאה ותיאור משימה");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    await api.checkoutVehicle({
      plate: checkoutModal.plate,
      driver: missionForm.driver.trim(),
      departureLocation: missionForm.departureLocation.trim(),
      taskPurpose: missionForm.taskPurpose.trim(),
      missionType: missionForm.missionType,
      requesterName: missionForm.requesterName.trim() || undefined,
      requestingDepartment: missionForm.requestingDepartment || undefined,
      departureTime: missionForm.departureTime
        ? new Date(missionForm.departureTime).toISOString()
        : new Date().toISOString(),
    });
    await onRefresh();
    setIsSubmitting(false);
    resetMissionModal();
  };

  const handleReturn = async () => {
    if (!returnModal) return;
    if (!returnForm.treatmentSummary.trim()) {
      setActionError("יש להזין סיכום טיפול לסגירת המשימה");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    const workHoursValue = returnForm.workHours.trim();
    const result = await api.returnVehicleDetailed({
      plate: returnModal.plate,
      workHours: workHoursValue ? Number(workHoursValue) : undefined,
      treatmentSummary: returnForm.treatmentSummary.trim(),
      returnTime: new Date().toISOString(),
    });

    if (!result.data) {
      setActionError(formatVehicleError(result.error));
      setIsSubmitting(false);
      return;
    }

    await onRefresh();
    setIsSubmitting(false);
    resetReturnModal();
  };

  const handleMaintenance = async (plate: string) => {
    await api.updateVehicleStatus(plate, "maintenance");
    await onRefresh();
  };

  const handleCampTaskCreate = async () => {
    if (!campTaskForm.requesterName.trim() || !campTaskForm.mission.trim() || !campTaskForm.treatmentSummary.trim()) {
      setActionError("יש למלא שם מבקש, משימה וסיכום טיפול");
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    const result = await api.createCampTaskDetailed({
      date: campTaskForm.date,
      department: campTaskForm.department || undefined,
      requesterName: campTaskForm.requesterName.trim(),
      mission: campTaskForm.mission.trim(),
      treatmentSummary: campTaskForm.treatmentSummary.trim(),
    });

    if (!result.data) {
      setActionError(formatVehicleError(result.error));
      setIsSubmitting(false);
      return;
    }

    await onRefresh();
    setIsSubmitting(false);
    setCampTaskModalOpen(false);
    setCampTaskForm({
      date: formatDateForInput(),
      department: departments[0]?.name ?? "",
      requesterName: "",
      mission: "",
      treatmentSummary: "",
    });
  };

  const exportVehicleReport = () => {
    downloadCsv("vehicle-missions-report.csv", [
      ["תאריך", "מיקום", "שעות עבודה", "סוג הרכב", "משימה", "סיכום טיפול"],
      ...vehicleReportRows.map((row) => [
        row.date,
        row.location,
        row.workHours,
        row.vehicleType,
        row.missionType,
        row.treatmentSummary,
      ]),
    ]);
  };

  const exportCampReport = () => {
    downloadCsv("camp-tasks-report.csv", [
      ["תאריך", "מחלקה / שם המבקש", "משימה", "סיכום טיפול"],
      ...campReportRows.map((row) => [
        row.date,
        row.requester,
        row.mission,
        row.treatmentSummary,
      ]),
    ]);
  };

  const vehicleColumns = [
    {
      key: "plate",
      header: "לוחית רישוי",
      render: (vehicle: Vehicle) => <span className="font-mono font-bold">{vehicle.plate}</span>,
    },
    { key: "vehicleType", header: "סוג רכב", render: (vehicle: Vehicle) => vehicle.vehicleType || "—" },
    {
      key: "status",
      header: "סטטוס",
      render: (vehicle: Vehicle) => (
        <Badge variant={vehicleStatusVariant(vehicle.status)}>
          {vehicleStatusLabel(vehicle.status)}
        </Badge>
      ),
    },
    {
      key: "mission",
      header: "משימה פעילה",
      render: (vehicle: Vehicle) =>
        vehicle.status === "in_use" ? (
          <div className="text-sm">
            <div className="font-medium">{vehicle.taskPurpose || "—"}</div>
            <div className="text-xs text-muted-foreground">
              {(vehicle.departureLocation || "ללא מיקום")} • {vehicle.currentDriver || "ללא נהג"}
            </div>
          </div>
        ) : (
          "—"
        ),
    },
    { key: "notes", header: "הערות", render: (vehicle: Vehicle) => vehicle.notes || "—" },
    {
      key: "actions",
      header: "פעולות",
      render: (vehicle: Vehicle) => (
        <div className="flex flex-wrap gap-3">
          {vehicle.status === "available" && (
            <>
              <button
                onClick={() => {
                  setCheckoutModal(vehicle);
                  setActionError(null);
                }}
                className="text-xs font-medium text-primary hover:underline"
              >
                פתח משימה
              </button>
              <button
                onClick={() => handleMaintenance(vehicle.plate)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                תחזוקה
              </button>
            </>
          )}
          {vehicle.status === "in_use" && (
            <button
              onClick={() => openReturnModal(vehicle)}
              className="text-xs font-medium text-status-success-text hover:underline"
            >
              סגירת משימה
            </button>
          )}
          {vehicle.status === "maintenance" && (
            <button
              onClick={() => api.updateVehicleStatus(vehicle.plate, "available").then(onRefresh)}
              className="text-xs font-medium text-primary hover:underline"
            >
              סיים תחזוקה
            </button>
          )}
        </div>
      ),
    },
  ];

  const vehicleReportColumns = [
    { key: "date", header: "תאריך" },
    { key: "location", header: "מיקום" },
    { key: "workHours", header: "שעות עבודה" },
    { key: "vehicleType", header: "סוג הרכב" },
    { key: "missionType", header: "משימה" },
    { key: "treatmentSummary", header: "סיכום טיפול" },
  ];

  const campReportColumns = [
    { key: "date", header: "תאריך" },
    { key: "requester", header: "מחלקה / שם המבקש" },
    { key: "mission", header: "משימה" },
    { key: "treatmentSummary", header: "סיכום טיפול" },
  ];

  const recentTaskColumns = [
    {
      key: "date",
      header: "תאריך יציאה",
      render: (task: VehicleTask) => formatDateTime(task.departureTime),
    },
    { key: "plate", header: "רכב" },
    { key: "vehicleType", header: "סוג" },
    { key: "departureLocation", header: "מיקום" },
    { key: "taskPurpose", header: "מטרת משימה" },
    {
      key: "missionType",
      header: "סוג משימה",
      render: (task: VehicleTask) => vehicleMissionTypeLabel(task.missionType),
    },
    {
      key: "treatmentSummary",
      header: "סיכום טיפול",
      render: (task: VehicleTask) => task.treatmentSummary || "—",
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="רכבים" subtitle="ניהול משימות, סגירת טיפולים ודוחות שבועיים" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="פנויים" value={available.length} variant="success" icon={<Truck size={18} />} />
        <SummaryCard label="במשימה" value={inUse.length} variant="warning" icon={<ClipboardList size={18} />} />
        <SummaryCard label="תחזוקה" value={maintenance.length} variant="danger" icon={<Wrench size={18} />} />
        <SummaryCard
          label="משימות השבוע"
          value={weeklyVehicleTasks.length}
          sub={`${weeklyCampTasks.length} משימות שטח בה״ד 6`}
          icon={<FileText size={18} />}
        />
      </div>

      {inUse.length > 0 && (
        <section>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            רכבים במשימה כעת
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {inUse.map((vehicle) => (
              <div key={vehicle.plate} className="flex flex-col gap-3 rounded-lg bg-card p-4 shadow-card sm:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2">
                    <span className="rounded-md bg-status-warning-bg px-3 py-1 font-mono text-lg font-bold text-status-warning-text">
                      {vehicle.plate}
                    </span>
                    {vehicle.vehicleType && <Badge variant="info">{vehicle.vehicleType}</Badge>}
                  </div>
                  <Badge variant="warning">במשימה</Badge>
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-xs text-muted-foreground">נהג</span>
                    <p className="font-medium">{vehicle.currentDriver || "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">יציאה</span>
                    <p className="font-medium">{formatDateTime(vehicle.departureTime)}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">נקודת יציאה</span>
                    <p className="font-medium">{vehicle.departureLocation || "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs text-muted-foreground">סוג משימה</span>
                    <p className="font-medium">{vehicleMissionTypeLabel(vehicle.missionType)}</p>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-xs text-muted-foreground">מטרת משימה</span>
                    <p className="font-medium">{vehicle.taskPurpose || "—"}</p>
                  </div>
                </div>
                <button
                  onClick={() => openReturnModal(vehicle)}
                  className="flex items-center justify-center gap-2 rounded-md bg-status-success-bg px-3 py-2.5 text-sm font-medium text-status-success-text transition-opacity hover:opacity-80 sm:justify-start"
                >
                  <RotateCcw size={14} />
                  סגור משימה
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          צי רכבים
        </h3>
        <DataTable
          columns={vehicleColumns}
          data={vehicles}
          rowKey={(vehicle) => vehicle.plate}
          emptyMessage="אין רכבים להצגה"
          minWidthClassName="min-w-[60rem]"
        />
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              דוחות משימות
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              סינון לפי טווח תאריכים והפקת CSV לדוח נסיעות/משימות ולדוח משימות שטח בה״ד 6
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-base font-semibold text-foreground">דוח נסיעות ומשימות</h4>
                <p className="text-sm text-muted-foreground">תאריך, מיקום, שעות עבודה, סוג רכב, משימה וסיכום טיפול</p>
              </div>
              <button
                onClick={exportVehicleReport}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                <Download size={14} />
                יצוא CSV
              </button>
            </div>
            <DataTable
              columns={vehicleReportColumns}
              data={vehicleReportRows}
              rowKey={(row) => row.id}
              emptyMessage="אין משימות בטווח התאריכים שנבחר"
              minWidthClassName="min-w-[54rem]"
            />
          </div>

          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h4 className="text-base font-semibold text-foreground">דוח משימות שטח בה״ד 6</h4>
                <p className="text-sm text-muted-foreground">תאריך, מחלקה/מבקש, משימה וסיכום טיפול</p>
              </div>
              <button
                onClick={exportCampReport}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
              >
                <Download size={14} />
                יצוא CSV
              </button>
            </div>
            <DataTable
              columns={campReportColumns}
              data={campReportRows}
              rowKey={(row) => row.id}
              emptyMessage="אין משימות שטח בטווח התאריכים שנבחר"
              minWidthClassName="min-w-[48rem]"
            />
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              משימות שטח בה״ד 6
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              רישום משימות ללא רכב לצורך מעקב ודוח מבקשים
            </p>
          </div>
          <button
            onClick={() => {
              setCampTaskModalOpen(true);
              setActionError(null);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Plus size={15} />
            הוספת משימת שטח
          </button>
        </div>
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

      <section>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          משימות רכב אחרונות
        </h3>
        <DataTable
          columns={recentTaskColumns}
          data={recentVehicleTasks}
          rowKey={(task) => task.id}
          emptyMessage="אין משימות רכב מתועדות"
          minWidthClassName="min-w-[68rem]"
        />
      </section>

      <Modal
        open={!!checkoutModal}
        onClose={resetMissionModal}
        title={`פתיחת משימה — ${checkoutModal?.plate}`}
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">נהג</label>
              <input
                type="text"
                value={missionForm.driver}
                onChange={(event) => setMissionForm((current) => ({ ...current, driver: event.target.value }))}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">נקודת יציאה</label>
              <input
                type="text"
                value={missionForm.departureLocation}
                onChange={(event) => setMissionForm((current) => ({ ...current, departureLocation: event.target.value }))}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-sm font-medium">מטרת משימה</label>
              <input
                type="text"
                value={missionForm.taskPurpose}
                onChange={(event) => setMissionForm((current) => ({ ...current, taskPurpose: event.target.value }))}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">סוג משימה</label>
              <select
                value={missionForm.missionType}
                onChange={(event) => setMissionForm((current) => ({ ...current, missionType: event.target.value as VehicleTask["missionType"] }))}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              >
                {vehicleMissionTypeOptions().map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">תאריך ושעת יציאה</label>
              <input
                type="datetime-local"
                value={missionForm.departureTime}
                onChange={(event) => setMissionForm((current) => ({ ...current, departureTime: event.target.value }))}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">שם המבקש</label>
              <input
                type="text"
                value={missionForm.requesterName}
                onChange={(event) => setMissionForm((current) => ({ ...current, requesterName: event.target.value }))}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">מחלקה מבקשת</label>
              <select
                value={missionForm.requestingDepartment}
                onChange={(event) => setMissionForm((current) => ({ ...current, requestingDepartment: event.target.value }))}
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
          </div>
          {actionError && <p className="text-sm text-status-danger-text">{actionError}</p>}
          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row">
            <button
              onClick={handleCheckout}
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
            >
              <CheckCircle size={15} />
              {isSubmitting ? "שומר..." : "אשר פתיחת משימה"}
            </button>
            <button
              onClick={resetMissionModal}
              className="w-full rounded-md px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted sm:w-auto"
            >
              ביטול
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!returnModal}
        onClose={resetReturnModal}
        title={`סגירת משימה — ${returnModal?.plate}`}
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            משימה פעילה: <span className="font-medium text-foreground">{returnModal?.taskPurpose || "—"}</span>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">שעות עבודה</label>
            <input
              type="number"
              min={0}
              step={0.25}
              value={returnForm.workHours}
              onChange={(event) => setReturnForm((current) => ({ ...current, workHours: event.target.value }))}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">סיכום טיפול</label>
            <textarea
              value={returnForm.treatmentSummary}
              onChange={(event) => setReturnForm((current) => ({ ...current, treatmentSummary: event.target.value }))}
              className="min-h-28 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              dir="rtl"
            />
          </div>
          {actionError && <p className="text-sm text-status-danger-text">{actionError}</p>}
          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row">
            <button
              onClick={handleReturn}
              disabled={isSubmitting}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
            >
              {isSubmitting ? "שומר..." : "סגור משימה"}
            </button>
            <button
              onClick={resetReturnModal}
              className="w-full rounded-md px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted sm:w-auto"
            >
              ביטול
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={campTaskModalOpen}
        onClose={() => {
          setCampTaskModalOpen(false);
          setActionError(null);
        }}
        title="הוספת משימת שטח בה״ד 6"
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">תאריך</label>
              <input
                type="date"
                value={campTaskForm.date}
                onChange={(event) => setCampTaskForm((current) => ({ ...current, date: event.target.value }))}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">מחלקה</label>
              <select
                value={campTaskForm.department}
                onChange={(event) => setCampTaskForm((current) => ({ ...current, department: event.target.value }))}
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
                value={campTaskForm.requesterName}
                onChange={(event) => setCampTaskForm((current) => ({ ...current, requesterName: event.target.value }))}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-sm font-medium">משימה</label>
              <input
                type="text"
                value={campTaskForm.mission}
                onChange={(event) => setCampTaskForm((current) => ({ ...current, mission: event.target.value }))}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              />
            </div>
            <div className="flex flex-col gap-1 sm:col-span-2">
              <label className="text-sm font-medium">סיכום טיפול</label>
              <textarea
                value={campTaskForm.treatmentSummary}
                onChange={(event) => setCampTaskForm((current) => ({ ...current, treatmentSummary: event.target.value }))}
                className="min-h-28 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              />
            </div>
          </div>
          {actionError && <p className="text-sm text-status-danger-text">{actionError}</p>}
          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row">
            <button
              onClick={handleCampTaskCreate}
              disabled={isSubmitting}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
            >
              {isSubmitting ? "שומר..." : "שמור משימה"}
            </button>
            <button
              onClick={() => {
                setCampTaskModalOpen(false);
                setActionError(null);
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
