import React, { useMemo, useState } from "react";
import { api } from "@/api";
import { DataTable } from "@/components/shared/DataTable";
import { Badge } from "@/components/shared/Badge";
import { Modal } from "@/components/shared/Modal";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { InitialData, Employee } from "@/types";
import {
  daysRemaining,
  downloadCsv,
  employeeStatusLabel,
  employeeStatusVariant,
  formatDate,
  getReserveStatus,
} from "@/utils";
import { Download, ShieldCheck, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  data: InitialData;
  onRefresh: () => Promise<void> | void;
}

type EmployeeEditForm = {
  employeeId: string;
  name: string;
  departmentId: string;
  status: Employee["status"];
  reserveStartDate: string;
  reserveEndDate: string;
  role: string;
  phone: string;
  qualificationIds: string[];
  drivingLicenseIds: string[];
};

function toggleSelection(list: string[], value: string): string[] {
  return list.includes(value)
    ? list.filter((item) => item !== value)
    : [...list, value];
}

function SelectionList({
  title,
  items,
  selectedIds,
  onToggle,
}: {
  title: string;
  items: Array<{ id: string; name: string }>;
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium">{title}</label>
      <div className="rounded-md border border-border bg-background p-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {items.map((item) => (
            <label
              key={item.id}
              className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(item.id)}
                onChange={() => onToggle(item.id)}
                className="h-4 w-4 rounded border-border"
              />
              <span>{item.name}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatWorkforceError(error?: string): string {
  if (!error) return "שמירת העובד נכשלה";
  const map: Record<string, string> = {
    "Department not found": "המחלקה שנבחרה לא נמצאה",
    "Driving license not found": "רישיון הנהיגה שנבחר לא נמצא",
    "Qualification not found": "ההכשרה שנבחרה לא נמצאה",
    "Employee already exists": "עובד בשם הזה כבר קיים",
    "Employee not found": "העובד לא נמצא",
    "Missing employee name": "יש להזין שם עובד",
    "Missing employee ID": "חסר מזהה עובד",
  };
  return map[error] ?? error;
}

export const WorkforcePage: React.FC<Props> = ({ data, onRefresh }) => {
  const {
    employees,
    departments,
    qualifications,
    drivingLicenses,
    employeeQualifications,
    employeeDrivingLicenses,
  } = data;
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("הכל");
  const [statusFilter, setStatusFilter] = useState("הכל");
  const [editForm, setEditForm] = useState<EmployeeEditForm | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const qualificationNameById = useMemo(
    () => new Map(qualifications.map((qualification) => [qualification.id, qualification.name])),
    [qualifications]
  );
  const drivingLicenseNameById = useMemo(
    () => new Map(drivingLicenses.map((license) => [license.id, license.name])),
    [drivingLicenses]
  );

  const employeeQualificationsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    employeeQualifications.forEach((assignment) => {
      const current = map.get(assignment.employeeId) ?? [];
      current.push(qualificationNameById.get(assignment.qualificationId) ?? assignment.qualificationId);
      map.set(assignment.employeeId, current.sort((a, b) => a.localeCompare(b, "he")));
    });
    return map;
  }, [employeeQualifications, qualificationNameById]);

  const employeeDrivingLicensesMap = useMemo(() => {
    const map = new Map<string, string[]>();
    employeeDrivingLicenses.forEach((assignment) => {
      const current = map.get(assignment.employeeId) ?? [];
      current.push(
        drivingLicenseNameById.get(assignment.drivingLicenseId) ?? assignment.drivingLicenseId
      );
      map.set(assignment.employeeId, current.sort((a, b) => a.localeCompare(b, "he")));
    });
    return map;
  }, [drivingLicenseNameById, employeeDrivingLicenses]);

  const employeeQualificationIdsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    employeeQualifications.forEach((assignment) => {
      const current = map.get(assignment.employeeId) ?? [];
      current.push(assignment.qualificationId);
      map.set(assignment.employeeId, current);
    });
    return map;
  }, [employeeQualifications]);

  const employeeDrivingLicenseIdsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    employeeDrivingLicenses.forEach((assignment) => {
      const current = map.get(assignment.employeeId) ?? [];
      current.push(assignment.drivingLicenseId);
      map.set(assignment.employeeId, current);
    });
    return map;
  }, [employeeDrivingLicenses]);

  const employeesWithAssignments = useMemo(
    () =>
      employees.map((employee) => ({
        ...employee,
        qualifications: employeeQualificationsMap.get(employee.id) ?? [],
        drivingLicenses: employeeDrivingLicensesMap.get(employee.id) ?? [],
      })),
    [employeeDrivingLicensesMap, employeeQualificationsMap, employees]
  );

  const inReserve = employees.filter((employee) => employee.status === "reserve").length;
  const activeCount = employees.filter((employee) => employee.status === "active").length;
  const endingSoon = employees.filter((employee) => {
    return getReserveStatus(employee.status, employee.reserveEndDate) === "reserve_ending_soon";
  }).length;

  const filtered = useMemo(() => {
    return employeesWithAssignments.filter((employee) => {
      const matchSearch =
        !search ||
        employee.name.includes(search) ||
        employee.department.includes(search) ||
        employee.role?.includes(search) ||
        employee.qualifications.some((qualification) => qualification.includes(search)) ||
        employee.drivingLicenses.some((license) => license.includes(search));
      const matchDept = deptFilter === "הכל" || employee.department === deptFilter;
      const matchStatus = statusFilter === "הכל" || employee.status === statusFilter;
      return matchSearch && matchDept && matchStatus;
    });
  }, [deptFilter, employeesWithAssignments, search, statusFilter]);

  const openEditModal = (employee: Employee) => {
    const departmentId =
      departments.find((department) => department.name === employee.department)?.id ?? departments[0]?.id ?? "";
    setActionError(null);
    setEditForm({
      employeeId: employee.id,
      name: employee.name,
      departmentId,
      status: employee.status,
      reserveStartDate: employee.reserveStartDate || "",
      reserveEndDate: employee.reserveEndDate || "",
      role: employee.role || "",
      phone: employee.phone || "",
      qualificationIds: employeeQualificationIdsMap.get(employee.id) ?? [],
      drivingLicenseIds: employeeDrivingLicenseIdsMap.get(employee.id) ?? [],
    });
  };

  const exportFilteredEmployees = () => {
    downloadCsv("workforce-reserve.csv", [
      ["שם", "מחלקה", "תפקיד", "סטטוס", "תחילת מילואים", "סיום מילואים", "הכשרות", "רישיונות נהיגה"],
      ...filtered.map((employee) => [
        employee.name,
        employee.department,
        employee.role || "",
        employeeStatusLabel(employee.status),
        formatDate(employee.reserveStartDate),
        formatDate(employee.reserveEndDate),
        employee.qualifications.join(", "),
        employee.drivingLicenses.join(", "),
      ]),
    ]);
  };

  const saveEmployee = async () => {
    if (!editForm) return;
    setIsSaving(true);
    setActionError(null);

    const result = await api.updateEmployeeDetailed({
      employeeId: editForm.employeeId,
      name: editForm.name.trim(),
      departmentId: editForm.departmentId,
      status: editForm.status,
      reserveStartDate: editForm.status === "reserve" ? editForm.reserveStartDate || undefined : undefined,
      reserveEndDate: editForm.status === "reserve" ? editForm.reserveEndDate || undefined : undefined,
      role: editForm.role.trim() || undefined,
      phone: editForm.phone.trim() || undefined,
      qualificationIds: editForm.qualificationIds,
      drivingLicenseIds: editForm.drivingLicenseIds,
    });

    if (!result.data) {
      setActionError(formatWorkforceError(result.error));
      setIsSaving(false);
      return;
    }

    await onRefresh();
    setIsSaving(false);
    setEditForm(null);
  };

  const columns = [
    {
      key: "name",
      header: "שם עובד",
      render: (employee: typeof employeesWithAssignments[number]) => (
        <div>
          <div className="font-semibold text-foreground">{employee.name}</div>
          <div className="text-xs text-muted-foreground">לחיצה על השורה לעריכה</div>
        </div>
      ),
    },
    { key: "department", header: "מחלקה" },
    { key: "role", header: "תפקיד", render: (employee: typeof employeesWithAssignments[number]) => employee.role || "—" },
    {
      key: "status",
      header: "סטטוס",
      render: (employee: typeof employeesWithAssignments[number]) => {
        const reserveStatus = getReserveStatus(employee.status, employee.reserveEndDate);
        const days = daysRemaining(employee.reserveEndDate);

        if (reserveStatus === "reserve_ending_soon") {
          return (
            <span className="flex items-center gap-2">
              <Badge variant="warning">מילואים</Badge>
              <span className="text-xs font-bold text-status-warning-text">
                {days} ימים
              </span>
            </span>
          );
        }

        if (reserveStatus === "reserve_ended") {
          return <Badge variant="neutral">מילואים הסתיים</Badge>;
        }

        return (
          <Badge variant={employeeStatusVariant(employee.status)}>
            {employeeStatusLabel(employee.status)}
          </Badge>
        );
      },
    },
    {
      key: "reserveStartDate",
      header: "תחילת מילואים",
      render: (employee: typeof employeesWithAssignments[number]) => formatDate(employee.reserveStartDate),
    },
    {
      key: "reserveEndDate",
      header: "סיום מילואים",
      render: (employee: typeof employeesWithAssignments[number]) => {
        const reserveStatus = getReserveStatus(employee.status, employee.reserveEndDate);
        return (
          <span className={cn(reserveStatus === "reserve_ending_soon" && "font-bold text-status-warning-text")}>
            {formatDate(employee.reserveEndDate)}
          </span>
        );
      },
    },
    {
      key: "qualifications",
      header: "הכשרות",
      render: (employee: typeof employeesWithAssignments[number]) =>
        employee.qualifications.length > 0 ? employee.qualifications.join(", ") : "—",
    },
    {
      key: "drivingLicenses",
      header: "רישיונות נהיגה",
      render: (employee: typeof employeesWithAssignments[number]) =>
        employee.drivingLicenses.length > 0 ? employee.drivingLicenses.join(", ") : "—",
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="כוח אדם ומילואים"
        subtitle="ניהול כוח האדם, שיוכים מקצועיים ומעקב מילואים"
        action={
          <button
            onClick={exportFilteredEmployees}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted sm:w-auto"
          >
            <Download size={14} />
            יצוא כוח אדם
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="סה״כ במילואים" value={inReserve} icon={<Users size={18} />} />
        <SummaryCard label="פעילים" value={activeCount} variant="success" />
        <SummaryCard label="בעלי הכשרות" value={employeesWithAssignments.filter((employee) => employee.qualifications.length > 0).length} icon={<ShieldCheck size={18} />} />
        <SummaryCard
          label="מסיימים תוך 14 יום"
          value={endingSoon}
          variant={endingSoon > 0 ? "danger" : "neutral"}
          sub="דורשים תשומת לב"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="חיפוש עובד, הכשרה או רישיון..."
          className="w-full sm:w-72"
        />
        <select
          value={deptFilter}
          onChange={(event) => setDeptFilter(event.target.value)}
          className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto"
          dir="rtl"
        >
          <option>הכל</option>
          {departments.map((department) => (
            <option key={department.id}>{department.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          className="h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring sm:w-auto"
          dir="rtl"
        >
          <option value="הכל">הכל</option>
          <option value="active">פעיל</option>
          <option value="reserve">מילואים</option>
          <option value="inactive">לא פעיל</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        rowKey={(employee) => employee.id}
        onRowClick={openEditModal}
        emptyMessage="לא נמצאו עובדים"
        minWidthClassName="min-w-[70rem]"
      />

      <Modal
        open={!!editForm}
        onClose={() => {
          setEditForm(null);
          setActionError(null);
        }}
        title={editForm ? `עריכת עובד: ${editForm.name}` : "עריכת עובד"}
        width="max-w-3xl"
      >
        {editForm && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">שם עובד</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(event) => setEditForm((current) => current ? { ...current, name: event.target.value } : current)}
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  dir="rtl"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">מחלקה</label>
                <select
                  value={editForm.departmentId}
                  onChange={(event) => setEditForm((current) => current ? { ...current, departmentId: event.target.value } : current)}
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  dir="rtl"
                >
                  {departments.map((department) => (
                    <option key={department.id} value={department.id}>
                      {department.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">תפקיד</label>
                <input
                  type="text"
                  value={editForm.role}
                  onChange={(event) => setEditForm((current) => current ? { ...current, role: event.target.value } : current)}
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  dir="rtl"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">טלפון</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(event) => setEditForm((current) => current ? { ...current, phone: event.target.value } : current)}
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  dir="rtl"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">סטטוס</label>
                <select
                  value={editForm.status}
                  onChange={(event) =>
                    setEditForm((current) =>
                      current
                        ? {
                            ...current,
                            status: event.target.value as Employee["status"],
                            reserveStartDate:
                              event.target.value === "reserve" ? current.reserveStartDate : "",
                            reserveEndDate:
                              event.target.value === "reserve" ? current.reserveEndDate : "",
                          }
                        : current
                    )
                  }
                  className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  dir="rtl"
                >
                  <option value="active">פעיל</option>
                  <option value="reserve">מילואים</option>
                  <option value="inactive">לא פעיל</option>
                </select>
              </div>
              {editForm.status === "reserve" && (
                <>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">תחילת מילואים</label>
                    <input
                      type="date"
                      value={editForm.reserveStartDate}
                      onChange={(event) => setEditForm((current) => current ? { ...current, reserveStartDate: event.target.value } : current)}
                      className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">סיום מילואים</label>
                    <input
                      type="date"
                      value={editForm.reserveEndDate}
                      onChange={(event) => setEditForm((current) => current ? { ...current, reserveEndDate: event.target.value } : current)}
                      className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </>
              )}
            </div>

            <SelectionList
              title="הכשרות"
              items={qualifications}
              selectedIds={editForm.qualificationIds}
              onToggle={(id) =>
                setEditForm((current) =>
                  current
                    ? { ...current, qualificationIds: toggleSelection(current.qualificationIds, id) }
                    : current
                )
              }
            />
            <SelectionList
              title="רישיונות נהיגה"
              items={drivingLicenses}
              selectedIds={editForm.drivingLicenseIds}
              onToggle={(id) =>
                setEditForm((current) =>
                  current
                    ? {
                        ...current,
                        drivingLicenseIds: toggleSelection(current.drivingLicenseIds, id),
                      }
                    : current
                )
              }
            />

            {actionError && <p className="text-sm text-status-danger-text">{actionError}</p>}

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button
                onClick={saveEmployee}
                disabled={isSaving}
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
              >
                {isSaving ? "שומר..." : "שמור שינויים"}
              </button>
              <button
                onClick={() => {
                  setEditForm(null);
                  setActionError(null);
                }}
                className="w-full rounded-md px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted sm:w-auto"
              >
                ביטול
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
