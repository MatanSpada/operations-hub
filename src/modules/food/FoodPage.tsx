/**
 * src/modules/food/FoodPage.tsx
 * ==============================
 * Food module — warehouse inventory + apartment supply tracking.
 */

import React, { useMemo, useState } from "react";
import { FoodProduct, InitialData } from "@/types";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { PageHeader } from "@/components/shared/PageHeader";
import { AlertBanner } from "@/components/shared/AlertBanner";
import { Badge } from "@/components/shared/Badge";
import { Modal } from "@/components/shared/Modal";
import { api } from "@/api";
import {
  calcWarehouseStock,
  isApartmentStale,
  formatDate,
  daysSince,
  formatQuantity,
} from "@/utils";
import { ALERT_THRESHOLDS } from "@/config";
import { ShoppingBasket, Home, Plus, Boxes, PackagePlus, House, ArrowRightLeft } from "lucide-react";

interface Props {
  data: InitialData;
  onRefresh: () => void;
}

type FoodActionMode = "set_quantity" | "supply_apartment";
type SupplyAmount = "0.5" | "1";

function formatFoodActionError(error?: string): string {
  if (!error) return "הפעולה נכשלה";

  if (error.startsWith("Unknown action: createFoodProduct")) {
    return "ה-endpoint המחובר ב-Google Apps Script לא מכיל עדיין את createFoodProduct. יש לעדכן את VITE_GAS_URL לכתובת הפריסה החדשה או לפרוס מחדש את ה-Web App.";
  }

  if (error.startsWith("Unknown action: setFoodStock")) {
    return "ה-endpoint המחובר ב-Google Apps Script לא מכיל עדיין את setFoodStock. יש לעדכן את VITE_GAS_URL לכתובת הפריסה החדשה או לפרוס מחדש את ה-Web App.";
  }

  return error;
}

export const FoodPage: React.FC<Props> = ({ data, onRefresh }) => {
  const { foodProducts, foodTransactions, apartments } = data;
  const [activeTab, setActiveTab] = useState<"warehouse" | "apartments">("warehouse");
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [actionProduct, setActionProduct] = useState<(FoodProduct & { qty: number }) | null>(null);
  const [actionMode, setActionMode] = useState<FoodActionMode>("set_quantity");
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [addProductForm, setAddProductForm] = useState({
    name: "",
    category: "",
    initialQuantity: "",
  });
  const [actionForm, setActionForm] = useState({
    quantity: "",
    apartmentId: "",
    supplyAmount: "1" as SupplyAmount,
  });

  const warehouseStock = useMemo(() =>
    foodProducts.map((p) => ({
      ...p,
      qty: calcWarehouseStock(foodTransactions, p.id),
    })),
  [foodProducts, foodTransactions]);

  const lowStock = warehouseStock.filter((p) => p.qty <= ALERT_THRESHOLDS.foodLowStockQty);
  const categoryOptions = useMemo(
    () => Array.from(new Set(foodProducts.map((product) => product.category).filter(Boolean))),
    [foodProducts]
  );

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

  const resetActionModal = () => {
    setActionProduct(null);
    setActionMode("set_quantity");
    setActionForm({ quantity: "", apartmentId: "", supplyAmount: "1" });
    setErrorMessage(null);
  };

  const openActionModal = (product: FoodProduct & { qty: number }) => {
    setActionProduct(product);
    setActionMode("set_quantity");
    setActionForm({
      quantity: String(product.qty),
      apartmentId: apartments[0]?.id ?? "",
      supplyAmount: "1",
    });
    setErrorMessage(null);
  };

  const handleCreateProduct = async () => {
    const name = addProductForm.name.trim();
    const category = addProductForm.category.trim();
    const initialQuantity = addProductForm.initialQuantity.trim();

    if (!name || !category) {
      setErrorMessage("יש למלא שם מוצר וקטגוריה");
      return;
    }

    const duplicate = foodProducts.some(
      (product) => product.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase()
    );
    if (duplicate) {
      setErrorMessage("מוצר בשם הזה כבר קיים במערכת");
      return;
    }

    if (initialQuantity && (Number.isNaN(Number(initialQuantity)) || Number(initialQuantity) < 0)) {
      setErrorMessage("כמות התחלתית חייבת להיות מספר חיובי או 0");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    const result = await api.createFoodProductDetailed({
      name,
      category,
      initialQuantity: initialQuantity ? Number(initialQuantity) : undefined,
    });

    if (!result.data) {
      setErrorMessage(formatFoodActionError(result.error || "שמירת המוצר נכשלה"));
      setIsSaving(false);
      return;
    }

    setAddProductOpen(false);
    setAddProductForm({ name: "", category: "", initialQuantity: "" });
    await onRefresh();
    setIsSaving(false);
  };

  const handleFoodAction = async () => {
    if (!actionProduct) return;

    setIsSaving(true);
    setErrorMessage(null);

    if (actionMode === "set_quantity") {
      const nextQuantity = Number(actionForm.quantity);
      if (Number.isNaN(nextQuantity) || nextQuantity < 0) {
        setErrorMessage("יש להזין כמות חוקית");
        setIsSaving(false);
        return;
      }

      const result = await api.setFoodStockDetailed(actionProduct.id, nextQuantity);
      if (!result.data) {
        setErrorMessage(formatFoodActionError(result.error || "עדכון הכמות נכשל"));
        setIsSaving(false);
        return;
      }
    }

    if (actionMode === "supply_apartment") {
      const quantity = Number(actionForm.supplyAmount);
      if (!actionForm.apartmentId) {
        setErrorMessage("יש לבחור דירה");
        setIsSaving(false);
        return;
      }
      if (actionProduct.qty < quantity) {
        setErrorMessage("אין מספיק מלאי לביצוע הנפקה");
        setIsSaving(false);
        return;
      }

      const result = await api.supplyApartmentDetailed(
        actionForm.apartmentId,
        actionProduct.id,
        quantity
      );
      if (!result.data) {
        setErrorMessage(formatFoodActionError(result.error || "הנפקת המוצר לדירה נכשלה"));
        setIsSaving(false);
        return;
      }
    }

    await onRefresh();
    setIsSaving(false);
    resetActionModal();
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="מזון ודירות"
        subtitle="מלאי מחסן, אספקה לדירות ומעקב שיפועים"
        action={
          activeTab === "warehouse" ? (
            <button
              onClick={() => {
                setAddProductOpen(true);
                setErrorMessage(null);
              }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
            >
              <Plus size={15} />
              הוספת מוצר
            </button>
          ) : undefined
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
      <div className="flex flex-wrap gap-2 border-b border-border pb-2">
        {(["warehouse", "apartments"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${activeTab === t ? "border-primary bg-primary/5 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            {t === "warehouse" ? "מחסן" : "דירות"}
          </button>
        ))}
      </div>

      {/* Warehouse */}
      {activeTab === "warehouse" && (
        <div className="overflow-hidden rounded-lg bg-card shadow-card">
          <div className="overflow-x-auto">
          <table className="min-w-[42rem] w-full text-sm" dir="rtl">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground sm:px-4">מוצר</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground sm:px-4">קטגוריה</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground sm:px-4">יחידות במחסן</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground sm:px-4">סטטוס</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground sm:px-4">פעולה</th>
              </tr>
            </thead>
            <tbody>
              {warehouseStock.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                  <td className="px-3 py-3 font-semibold sm:px-4">{p.name}</td>
                  <td className="px-3 py-3 text-muted-foreground sm:px-4">{p.category}</td>
                  <td className="px-3 py-3 font-bold tabular-nums sm:px-4">{formatQuantity(p.qty)}</td>
                  <td className="px-3 py-3 sm:px-4">
                    <Badge variant={p.qty <= ALERT_THRESHOLDS.foodLowStockQty ? "warning" : "success"}>
                      {p.qty <= ALERT_THRESHOLDS.foodLowStockQty ? "מלאי נמוך" : "תקין"}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 sm:px-4">
                    <button
                      onClick={() => openActionModal(p)}
                      className="inline-flex items-center gap-2 whitespace-nowrap text-xs font-medium text-primary hover:text-primary/80"
                    >
                      <ArrowRightLeft size={14} />
                      פעולה
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Apartments */}
      {activeTab === "apartments" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {apartmentSupply.map((apt) => {
            const stale = isApartmentStale(apt.lastSupplied);
            const days = daysSince(apt.lastSupplied);
            return (
              <div key={apt.id} className="flex flex-col gap-3 rounded-lg bg-card p-4 shadow-card sm:p-5">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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

      <Modal
        open={addProductOpen}
        onClose={() => {
          setAddProductOpen(false);
          setErrorMessage(null);
        }}
        title="הוספת מוצר חדש למחסן"
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground">שם מוצר</label>
              <input
                type="text"
                value={addProductForm.name}
                onChange={(e) => setAddProductForm({ ...addProductForm, name: e.target.value })}
                className="h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground">קטגוריה</label>
              <input
                type="text"
                list="food-category-options"
                value={addProductForm.category}
                onChange={(e) => setAddProductForm({ ...addProductForm, category: e.target.value })}
                className="h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              />
              <datalist id="food-category-options">
                {categoryOptions.map((category) => (
                  <option key={category} value={category} />
                ))}
              </datalist>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-foreground">כמות התחלתית במחסן (אופציונלי)</label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={addProductForm.initialQuantity}
              onChange={(e) => setAddProductForm({ ...addProductForm, initialQuantity: e.target.value })}
              className="h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              אם תוזן כמות, המערכת תיצור גם תנועת כניסה למחסן באותו מסלול נתונים של שאר המלאי.
            </p>
          </div>
          {errorMessage && <p className="text-sm text-status-danger-text">{errorMessage}</p>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-start">
            <button
              onClick={handleCreateProduct}
              disabled={isSaving}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
            >
              {isSaving ? "שומר..." : "שמור מוצר"}
            </button>
            <button
              onClick={() => {
                setAddProductOpen(false);
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
        open={!!actionProduct}
        onClose={resetActionModal}
        title={actionProduct ? `פעולה על ${actionProduct.name}` : "פעולה על מוצר"}
      >
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {([
              {
                id: "set_quantity" as const,
                title: "הזן כמות חדשה",
                description: "המערכת תשמור את הדלתא כתנועת מלאי כדי לשמור על עקביות.",
                icon: <PackagePlus size={18} />,
              },
              {
                id: "supply_apartment" as const,
                title: "נפק לדירה",
                description: "הנפקה לדירה תירשם כתנועת יציאה ותעדכן את תאריך האספקה של הדירה.",
                icon: <House size={18} />,
              },
            ]).map((option) => (
              <button
                key={option.id}
                onClick={() => {
                  setActionMode(option.id);
                  setErrorMessage(null);
                }}
                className={`rounded-xl border p-4 text-right transition-colors ${
                  actionMode === option.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:bg-muted/50"
                }`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  {option.icon}
                  {option.title}
                </div>
                <p className="mt-2 text-xs text-muted-foreground leading-5">{option.description}</p>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-1 rounded-lg bg-muted/50 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <span>מלאי נוכחי במחסן</span>
            <span className="font-semibold text-foreground">{actionProduct ? formatQuantity(actionProduct.qty) : "—"}</span>
          </div>

          {actionMode === "set_quantity" && (
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-foreground">כמות חדשה למחסן</label>
              <input
                type="number"
                min="0"
                step="0.5"
                value={actionForm.quantity}
                onChange={(e) => setActionForm({ ...actionForm, quantity: e.target.value })}
                className="h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          )}

          {actionMode === "supply_apartment" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">דירה</label>
                <select
                  value={actionForm.apartmentId}
                  onChange={(e) => setActionForm({ ...actionForm, apartmentId: e.target.value })}
                  className="h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  dir="rtl"
                >
                  <option value="">בחר דירה</option>
                  {apartments.map((apartment) => (
                    <option key={apartment.id} value={apartment.id}>
                      {apartment.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-foreground">כמות להנפקה</label>
                <select
                  value={actionForm.supplyAmount}
                  onChange={(e) =>
                    setActionForm({ ...actionForm, supplyAmount: e.target.value as SupplyAmount })
                  }
                  className="h-10 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  dir="rtl"
                >
                  <option value="0.5">חצי ארגז</option>
                  <option value="1">ארגז</option>
                </select>
              </div>
            </div>
          )}

          {errorMessage && <p className="text-sm text-status-danger-text">{errorMessage}</p>}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-start">
            <button
              onClick={handleFoodAction}
              disabled={isSaving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
            >
              <Boxes size={15} />
              {isSaving ? "שומר..." : "שמור פעולה"}
            </button>
            <button
              onClick={resetActionModal}
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
