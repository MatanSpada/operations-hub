/**
 * src/modules/food/FoodPage.tsx
 * ==============================
 * Food module — warehouse inventory + apartment supply tracking.
 */

import React, { useMemo, useState } from "react";
import { InitialData } from "@/types";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { AlertBanner } from "@/components/shared/AlertBanner";
import { Badge } from "@/components/shared/Badge";
import { calcWarehouseStock, isApartmentStale, formatDate, daysSince } from "@/utils";
import { ALERT_THRESHOLDS } from "@/config";
import { ShoppingBasket, Home } from "lucide-react";

interface Props { data: InitialData; }

export const FoodPage: React.FC<Props> = ({ data }) => {
  const { foodProducts, foodTransactions, apartments } = data;
  const [activeTab, setActiveTab] = useState<"warehouse" | "apartments">("warehouse");

  const warehouseStock = useMemo(() =>
    foodProducts.map((p) => ({
      ...p,
      qty: calcWarehouseStock(foodTransactions, p.id),
    })),
  [foodProducts, foodTransactions]);

  const lowStock = warehouseStock.filter((p) => p.qty <= ALERT_THRESHOLDS.foodLowStockQty);

  // Per-apartment last supply date
  const apartmentSupply = useMemo(() =>
    apartments.map((apt) => {
      const lastTx = foodTransactions
        .filter(
          (t) =>
            t.type === "out" &&
            (t.destinationApartmentId === apt.id || t.destination === apt.name)
        )
        .sort((a, b) => b.date.localeCompare(a.date))[0];
      return { ...apt, lastSupplied: lastTx?.date ?? apt.lastSupplied };
    }),
  [apartments, foodTransactions]);

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader title="מזון ודירות" subtitle="מלאי מחסן, אספקה לדירות ומעקב שיפועים" />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <SummaryCard label="סוגי מוצרים" value={foodProducts.length} icon={<ShoppingBasket size={18} />} />
        <SummaryCard label="דירות" value={apartments.length} icon={<Home size={18} />} />
        <SummaryCard
          label="מלאי נמוך"
          value={lowStock.length}
          variant={lowStock.length > 0 ? "warning" : "neutral"}
        />
      </div>

      {/* Low stock alerts */}
      {lowStock.map((p) => (
        <AlertBanner key={p.id} type="warning" title={`מלאי נמוך: ${p.name}`} message={`נשארו ${p.qty} יחידות במחסן`} />
      ))}

      {/* Tab Switch */}
      <div className="flex gap-2 border-b border-border">
        {(["warehouse", "apartments"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            {t === "warehouse" ? "מחסן" : "דירות"}
          </button>
        ))}
      </div>

      {/* Warehouse */}
      {activeTab === "warehouse" && (
        <div className="bg-card rounded-lg shadow-card overflow-hidden">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">מוצר</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">קטגוריה</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">יחידות במחסן</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">סטטוס</th>
              </tr>
            </thead>
            <tbody>
              {warehouseStock.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="px-4 py-3 font-semibold">{p.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.category}</td>
                  <td className="px-4 py-3 tabular-nums font-bold">{p.qty}</td>
                  <td className="px-4 py-3">
                    <Badge variant={p.qty <= ALERT_THRESHOLDS.foodLowStockQty ? "warning" : "success"}>
                      {p.qty <= ALERT_THRESHOLDS.foodLowStockQty ? "מלאי נמוך" : "תקין"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Apartments */}
      {activeTab === "apartments" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {apartmentSupply.map((apt) => {
            const stale = isApartmentStale(apt.lastSupplied);
            const days = daysSince(apt.lastSupplied);
            return (
              <div key={apt.id} className="bg-card rounded-lg shadow-card p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground">{apt.name}</span>
                  <Badge variant={stale ? "warning" : "success"}>
                    {stale ? "לא סופקה לאחרונה" : "מסופקת"}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {apt.lastSupplied ? (
                    <>אספקה אחרונה: <span className="font-medium text-foreground">{formatDate(apt.lastSupplied)}</span>{" "}<span className="text-xs">({days} ימים)</span></>
                  ) : (
                    <span className="text-status-danger-text">מעולם לא סופקה</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
