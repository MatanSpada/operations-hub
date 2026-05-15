import React from "react";
import { Modal } from "@/components/shared/Modal";
import { DrivingLicense, Vehicle } from "@/types";
import { Badge } from "@/components/shared/Badge";
import { vehicleStatusLabel, vehicleStatusVariant } from "@/utils";

export interface VehicleEditorForm {
  originalPlate: string;
  plate: string;
  vehicleType: string;
  notes: string;
  status: Vehicle["status"];
  currentDriver: string;
}

interface Props {
  open: boolean;
  title: string;
  form: VehicleEditorForm | null;
  drivingLicenses: DrivingLicense[];
  onChange: (next: VehicleEditorForm | null) => void;
  onSave: () => void;
  onClose: () => void;
  isSaving: boolean;
  actionError?: string | null;
}

export const VehicleEditorModal: React.FC<Props> = ({
  open,
  title,
  form,
  drivingLicenses,
  onChange,
  onSave,
  onClose,
  isSaving,
  actionError,
}) => {
  return (
    <Modal open={open} onClose={onClose} title={title} width="max-w-2xl">
      {form && (
        <div className="space-y-5">
          <div className="rounded-md border border-border bg-muted/30 p-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">סטטוס נוכחי:</span>
              <Badge variant={vehicleStatusVariant(form.status)}>
                {vehicleStatusLabel(form.status)}
              </Badge>
              {form.currentDriver && (
                <span className="text-muted-foreground">נהג נוכחי: {form.currentDriver}</span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="vehicle-edit-plate" className="text-sm font-medium">לוחית רישוי</label>
              <input
                id="vehicle-edit-plate"
                type="text"
                value={form.plate}
                onChange={(event) => onChange({ ...form, plate: event.target.value })}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="vehicle-edit-type" className="text-sm font-medium">סוג רכב</label>
              <select
                id="vehicle-edit-type"
                value={form.vehicleType}
                onChange={(event) => onChange({ ...form, vehicleType: event.target.value })}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              >
                <option value="">בחר סוג</option>
                {drivingLicenses.map((license) => (
                  <option key={license.id} value={license.name}>
                    {license.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1 md:col-span-2">
              <label htmlFor="vehicle-edit-notes" className="text-sm font-medium">הערות</label>
              <input
                id="vehicle-edit-notes"
                type="text"
                value={form.notes}
                onChange={(event) => onChange({ ...form, notes: event.target.value })}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              />
            </div>
          </div>

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
