import React from "react";
import { Modal } from "@/components/shared/Modal";
import { Department, DrivingLicense, Employee, Qualification } from "@/types";

export interface EmployeeEditorForm {
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
}

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

interface Props {
  open: boolean;
  title: string;
  form: EmployeeEditorForm | null;
  departments: Department[];
  qualifications: Qualification[];
  drivingLicenses: DrivingLicense[];
  onChange: (next: EmployeeEditorForm | null) => void;
  onSave: () => void;
  onClose: () => void;
  isSaving: boolean;
  actionError?: string | null;
}

export const EmployeeEditorModal: React.FC<Props> = ({
  open,
  title,
  form,
  departments,
  qualifications,
  drivingLicenses,
  onChange,
  onSave,
  onClose,
  isSaving,
  actionError,
}) => {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-3xl">
      {form && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">שם עובד</label>
              <input
                type="text"
                value={form.name}
                onChange={(event) => onChange({ ...form, name: event.target.value })}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">מחלקה</label>
              <select
                value={form.departmentId}
                onChange={(event) => onChange({ ...form, departmentId: event.target.value })}
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
                value={form.role}
                onChange={(event) => onChange({ ...form, role: event.target.value })}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">טלפון</label>
              <input
                type="text"
                value={form.phone}
                onChange={(event) => onChange({ ...form, phone: event.target.value })}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">סטטוס</label>
              <select
                value={form.status}
                onChange={(event) =>
                  onChange({
                    ...form,
                    status: event.target.value as Employee["status"],
                    reserveStartDate: event.target.value === "reserve" ? form.reserveStartDate : "",
                    reserveEndDate: event.target.value === "reserve" ? form.reserveEndDate : "",
                  })
                }
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              >
                <option value="active">פעיל</option>
                <option value="reserve">מילואים</option>
                <option value="inactive">לא פעיל</option>
              </select>
            </div>
            {form.status === "reserve" && (
              <>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">תחילת מילואים</label>
                  <input
                    type="date"
                    value={form.reserveStartDate}
                    onChange={(event) => onChange({ ...form, reserveStartDate: event.target.value })}
                    className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">סיום מילואים</label>
                  <input
                    type="date"
                    value={form.reserveEndDate}
                    onChange={(event) => onChange({ ...form, reserveEndDate: event.target.value })}
                    className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </>
            )}
          </div>

          <SelectionList
            title="הכשרות"
            items={qualifications}
            selectedIds={form.qualificationIds}
            onToggle={(id) => onChange({ ...form, qualificationIds: toggleSelection(form.qualificationIds, id) })}
          />

          <SelectionList
            title="רישיונות נהיגה"
            items={drivingLicenses}
            selectedIds={form.drivingLicenseIds}
            onToggle={(id) => onChange({ ...form, drivingLicenseIds: toggleSelection(form.drivingLicenseIds, id) })}
          />

          {actionError && <p className="text-sm text-status-danger-text">{actionError}</p>}

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              onClick={onSave}
              disabled={isSaving}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
            >
              {isSaving ? "שומר..." : "שמור שינויים"}
            </button>
            <button
              onClick={onClose}
              className="w-full rounded-md px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted sm:w-auto"
            >
              ביטול
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};
