/**
 * src/modules/dashboard/DashboardPage.tsx
 * =========================================
 * Dashboard module — operational overview for managers.
 *
 * ALERT RULES START HERE:
 * ─── Where to add new dashboard alerts ──────────────────────────────
 * 1. Write a compute function that scans the data (e.g. getOverdueItems)
 * 2. Push AlertBanner items into the `alerts` array below
 * 3. Each alert needs: type ("warning"|"danger"|"info"), title, message
 * ─────────────────────────────────────────────────────────────────────
 */

import React, { useMemo } from "react";
import { InitialData } from "@/types";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { AlertBanner } from "@/components/shared/AlertBanner";
import {
  daysRemaining,
  daysSince,
  isEquipmentOverdue,
  isApartmentStale,
  getReserveStatus,
} from "@/utils";
import { ALERT_THRESHOLDS } from "@/config";
import { Users, Truck, Zap, ShoppingBasket, AlertTriangle } from "lucide-react";

interface Props { data: InitialData; }

export const DashboardPage: React.FC<Props> = ({ data }) => {
  const {
    employees,
    vehicles,
    equipmentTypes,
    equipmentLedger,
    foodTransactions,
    foodProducts,
    apartments,
    departments,
  } = data;

  // ── Summary Metrics ───────────────────────────────────────────────
  const totalEmployees = employees.length;
  const inReserve = employees.filter((e) => e.status === "reserve").length;
  const available = totalEmployees - inReserve;
  const vehiclesInUse = vehicles.filter((v) => v.status === "in_use").length;
  const vehiclesAvailable = vehicles.filter((v) => v.status === "available").length;

  // Equipment: count overdue issues
  const overdueEquipment = equipmentLedger.filter(
    (l) => l.status !== "returned" && isEquipmentOverdue(l.expectedReturnDate)
  ).length;

  // ── Alert Engine ──────────────────────────────────────────────────
  // ALERT RULES START HERE — add new alert objects to this array
  const alerts = useMemo(() => {
    const items: { type: "warning" | "danger" | "info"; title: string; message: string }[] = [];

    // 1. Reserve duty ending soon (within 14 days)
    const endingSoon = employees.filter((e) => {
      if (e.status !== "reserve") return false;
      const rs = getReserveStatus(e.status, e.reserveEndDate);
      return rs === "reserve_ending_soon";
    });
    if (endingSoon.length > 0) {
      items.push({
        type: "warning",
        title: `${endingSoon.length} עובדים מסיימים מילואים תוך ${ALERT_THRESHOLDS.reserveDutyWarningDays} ימים`,
        message: endingSoon.map((e) => {
          const days = daysRemaining(e.reserveEndDate);
          return `${e.name} (${days} ימים נותרו)`;
        }).join(" • "),
      });
    }

    // 2. Overdue equipment returns
    const overdueItems = equipmentLedger.filter(
      (l) => l.status !== "returned" && isEquipmentOverdue(l.expectedReturnDate)
    );
    if (overdueItems.length > 0) {
      items.push({
        type: "danger",
        title: `${overdueItems.length} פריטי ציוד לא הוחזרו במועד`,
        message: overdueItems.slice(0, 3).map(
          (l) => `${l.equipmentName} × ${l.quantity} (${l.issuedTo})`
        ).join(" • ") + (overdueItems.length > 3 ? ` ועוד ${overdueItems.length - 3}` : ""),
      });
    }

    // 3. Apartments not supplied recently
    const staleApts = apartments.filter((a) => isApartmentStale(a.lastSupplied));
    if (staleApts.length > 0) {
      items.push({
        type: "warning",
        title: `${staleApts.length} דירות לא סופקו לאחרונה`,
        message: staleApts.map((a) => {
          const days = daysSince(a.lastSupplied);
          return days !== null ? `${a.name} (לפני ${days} ימים)` : `${a.name} (מעולם לא סופקה)`;
        }).join(" • "),
      });
    }

    // 4. Low food stock
    foodProducts.forEach((p) => {
      const stock = foodTransactions
        .filter((t) => t.productId === p.id)
        .reduce((sum, t) => sum + (t.type === "in" ? t.quantity : -t.quantity), 0);
      if (stock <= ALERT_THRESHOLDS.foodLowStockQty) {
        items.push({
          type: "warning",
          title: `מלאי נמוך: ${p.name}`,
          message: `נשארו ${stock} יחידות במחסן`,
        });
      }
    });

    // ADD NEW ALERT RULES ABOVE THIS LINE ↑
    return items;
  }, [employees, equipmentLedger, apartments, foodTransactions, foodProducts]);

  // ── Department breakdown ──────────────────────────────────────────
  const deptStats = useMemo(() =>
    departments.map((d) => {
      const dEmployees = employees.filter((e) => e.department === d.name);
      const dReserve = dEmployees.filter((e) => e.status === "reserve").length;
      return { name: d.name, total: dEmployees.length, reserve: dReserve };
    }).filter((d) => d.total > 0),
  [departments, employees]);

  return (
    <div className="animate-fade-in space-y-6 sm:space-y-8">
      {/* Summary cards */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          סיכום כללי
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard
            label="סה״כ עובדים"
            value={totalEmployees}
            sub={`${available} זמינים`}
            icon={<Users size={18} />}
          />
          <SummaryCard
            label="עובדים במילואים"
            value={inReserve}
            variant={inReserve > 0 ? "warning" : "neutral"}
            icon={<Users size={18} />}
          />
          <SummaryCard
            label="רכבים בשימוש"
            value={`${vehiclesInUse} / ${vehicles.length}`}
            sub={`${vehiclesAvailable} פנויים`}
            variant={vehiclesInUse > 0 ? "info" : "neutral"}
            icon={<Truck size={18} />}
          />
          <SummaryCard
            label="ציוד מושאל באיחור"
            value={overdueEquipment}
            variant={overdueEquipment > 0 ? "danger" : "neutral"}
            icon={<Zap size={18} />}
          />
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
            <AlertTriangle size={14} />
            התראות פעילות ({alerts.length})
          </h3>
          <div className="flex flex-col gap-2">
            {alerts.map((a, i) => (
              <AlertBanner key={i} type={a.type} title={a.title} message={a.message} />
            ))}
          </div>
        </div>
      )}

      {/* Department Breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          כוח אדם לפי מחלקה
        </h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {deptStats.map((d) => (
            <div
              key={d.name}
              className="flex flex-col gap-1 rounded-lg bg-card p-4 shadow-card"
            >
              <span className="text-xs font-medium text-muted-foreground">{d.name}</span>
              <span className="text-2xl font-bold text-foreground tabular-nums">{d.total}</span>
              {d.reserve > 0 && (
                <span className="text-xs text-status-warning-text">
                  {d.reserve} במילואים
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Quick status: vehicles */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Truck size={14} />
          רכבים בשימוש עכשיו
        </h3>
        {vehicles.filter((v) => v.status === "in_use").length === 0 ? (
          <p className="text-sm text-muted-foreground">אין רכבים בשימוש כרגע</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {vehicles.filter((v) => v.status === "in_use").map((v) => (
              <div key={v.plate} className="flex flex-col gap-3 rounded-lg bg-card p-4 shadow-card sm:flex-row sm:items-center sm:gap-4">
                <div className="bg-status-warning-bg rounded-md px-3 py-1 font-mono font-bold text-status-warning-text text-sm">
                  {v.plate}
                </div>
                <div className="flex flex-col text-sm">
                  <span className="font-medium">{v.currentDriver}</span>
                  <span className="text-xs text-muted-foreground">
                    {v.origin} → {v.destination}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
