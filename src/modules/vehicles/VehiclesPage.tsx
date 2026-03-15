/**
 * src/modules/vehicles/VehiclesPage.tsx
 * =======================================
 * Vehicles module — fleet status, check-out/return, history.
 *
 * ─── WHERE TO EDIT ──────────────────────────────────────────────────
 * • ADD NEW VEHICLE FIELD: update Vehicle type in types.ts, add column
 * • ADD NEW STATUS: add to Vehicle.status union and vehicleStatusLabel()
 * • ADD VEHICLE ACTION: add button + api call
 * ─────────────────────────────────────────────────────────────────────
 */

import React, { useState } from "react";
import { InitialData, Vehicle } from "@/types";
import { Badge } from "@/components/shared/Badge";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { Modal } from "@/components/shared/Modal";
import { PageHeader } from "@/components/shared/PageHeader";
import { vehicleStatusLabel, vehicleStatusVariant, formatDateTime } from "@/utils";
import { api } from "@/api";
import { Truck, Plus, CheckCircle, RotateCcw, Wrench } from "lucide-react";

interface Props { data: InitialData; onRefresh: () => void; }

export const VehiclesPage: React.FC<Props> = ({ data, onRefresh }) => {
  const { vehicles } = data;
  const [checkoutModal, setCheckoutModal] = useState<Vehicle | null>(null);
  const [form, setForm] = useState({ driver: "", origin: "", destination: "", departureTime: "" });

  const available = vehicles.filter((v) => v.status === "available");
  const inUse = vehicles.filter((v) => v.status === "in_use");
  const maintenance = vehicles.filter((v) => v.status === "maintenance");

  const handleCheckout = async () => {
    if (!checkoutModal) return;
    await api.checkoutVehicle({
      plate: checkoutModal.plate,
      driver: form.driver,
      origin: form.origin,
      destination: form.destination,
      departureTime: form.departureTime || new Date().toISOString(),
    });
    setCheckoutModal(null);
    setForm({ driver: "", origin: "", destination: "", departureTime: "" });
    onRefresh();
  };

  const handleReturn = async (plate: string) => {
    await api.returnVehicle(plate);
    onRefresh();
  };

  const handleMaintenance = async (plate: string) => {
    await api.updateVehicleStatus(plate, "maintenance");
    onRefresh();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="רכבים" subtitle="מעקב צי, שליחויות וסטטוס רכבים" />

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="פנויים" value={available.length} variant="success" icon={<Truck size={18} />} />
        <SummaryCard label="בשימוש" value={inUse.length} variant="warning" icon={<Truck size={18} />} />
        <SummaryCard label="תחזוקה" value={maintenance.length} variant="danger" icon={<Wrench size={18} />} />
      </div>

      {/* Vehicles in use */}
      {inUse.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            רכבים בשימוש כעת
          </h3>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {inUse.map((v) => (
              <div key={v.plate} className="flex flex-col gap-3 rounded-lg bg-card p-4 shadow-card sm:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="font-mono font-bold text-lg bg-status-warning-bg text-status-warning-text px-3 py-1 rounded-md">
                    {v.plate}
                  </span>
                  <Badge variant="warning">בשימוש</Badge>
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <span className="text-muted-foreground text-xs">נהג</span>
                    <p className="font-medium">{v.currentDriver || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">יציאה</span>
                    <p className="font-medium">{formatDateTime(v.departureTime)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">מוצא</span>
                    <p className="font-medium">{v.origin || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs">יעד</span>
                    <p className="font-medium">{v.destination || "—"}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleReturn(v.plate)}
                  className="flex items-center justify-center gap-2 rounded-md bg-status-success-bg px-3 py-2.5 text-sm font-medium text-status-success-text transition-opacity hover:opacity-80 sm:justify-start"
                >
                  <RotateCcw size={14} /> החזר רכב
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Available vehicles */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          כל הרכבים
        </h3>
        <div className="overflow-hidden rounded-lg bg-card shadow-card">
          <div className="overflow-x-auto">
          <table className="min-w-[44rem] w-full text-sm" dir="rtl">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground sm:px-4">לוחית רישוי</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground sm:px-4">סטטוס</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground sm:px-4">נהג נוכחי</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground sm:px-4">הערות</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground sm:px-4">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.plate} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="px-3 py-3 sm:px-4">
                    <span className="font-mono font-bold">{v.plate}</span>
                  </td>
                  <td className="px-3 py-3 sm:px-4">
                    <Badge variant={vehicleStatusVariant(v.status)}>
                      {vehicleStatusLabel(v.status)}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground sm:px-4">{v.currentDriver || "—"}</td>
                  <td className="px-3 py-3 text-xs text-muted-foreground sm:px-4">{v.notes || "—"}</td>
                  <td className="px-3 py-3 sm:px-4">
                    <div className="flex flex-wrap gap-3">
                      {v.status === "available" && (
                        <>
                          <button
                            onClick={() => setCheckoutModal(v)}
                            className="text-xs text-primary hover:underline font-medium"
                          >
                            שלח בשליחות
                          </button>
                          <button
                            onClick={() => handleMaintenance(v.plate)}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            תחזוקה
                          </button>
                        </>
                      )}
                      {v.status === "in_use" && (
                        <button
                          onClick={() => handleReturn(v.plate)}
                          className="text-xs text-status-success-text hover:underline font-medium"
                        >
                          החזר
                        </button>
                      )}
                      {v.status === "maintenance" && (
                        <button
                          onClick={() => api.updateVehicleStatus(v.plate, "available").then(onRefresh)}
                          className="text-xs text-primary hover:underline font-medium"
                        >
                          סיים תחזוקה
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      {/* Checkout Modal */}
      <Modal
        open={!!checkoutModal}
        onClose={() => setCheckoutModal(null)}
        title={`שלח רכב — ${checkoutModal?.plate}`}
      >
        <div className="flex flex-col gap-4">
          {(["driver", "origin", "destination"] as const).map((field) => {
            const labels = { driver: "נהג", origin: "מוצא", destination: "יעד" };
            return (
              <div key={field} className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">{labels[field]}</label>
                <input
                  type="text"
                  value={form[field]}
                  onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                  className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  dir="rtl"
                />
              </div>
            );
          })}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">זמן יציאה</label>
            <input
              type="datetime-local"
              value={form.departureTime}
              onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row sm:justify-start">
            <button
              onClick={handleCheckout}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
            >
              <CheckCircle size={15} /> אשר שליחות
            </button>
            <button
              onClick={() => setCheckoutModal(null)}
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
