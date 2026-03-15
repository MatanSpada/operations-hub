/**
 * src/modules/equipment/EquipmentPage.tsx
 * =========================================
 * Equipment module — issuance tracking, returns, overdue alerts.
 *
 * ─── WHERE TO EDIT ──────────────────────────────────────────────────
 * • ADD NEW EQUIPMENT FIELD: update EquipmentLedgerEntry in types.ts
 * • ADD NEW ALERT: check for new condition in the overdue/alert logic
 * • CHANGE OVERDUE LOGIC: update isEquipmentOverdue() in utils.ts
 * ─────────────────────────────────────────────────────────────────────
 */

import React, { useState, useMemo } from "react";
import { InitialData, EquipmentType, EquipmentLedgerEntry } from "@/types";
import { Badge } from "@/components/shared/Badge";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { Modal } from "@/components/shared/Modal";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import {
  calcAvailableQty,
  equipmentStatusLabel,
  equipmentStatusVariant,
  formatDate,
  isEquipmentOverdue,
} from "@/utils";
import { api } from "@/api";
import { Zap, AlertTriangle, Plus, ArrowRightLeft } from "lucide-react";

interface Props { data: InitialData; onRefresh: () => void; }

type EquipmentActionMode = "set_quantity" | "issue_item";

function formatEquipmentCreateError(error?: string): string {
  if (!error) return "שמירת הפריט נכשלה";
  if (error === "Equipment item already exists") {
    return "פריט בשם הזה כבר קיים במערכת";
  }
  return error;
}

function formatEquipmentActionError(error?: string): string {
  if (!error) return "הפעולה נכשלה";
  if (error.startsWith("Unknown action: setEquipmentStock")) {
    return "ה-endpoint המחובר ב-Google Apps Script לא מכיל עדיין את setEquipmentStock. יש לעדכן את VITE_GAS_URL לכתובת הפריסה החדשה או לפרוס מחדש את ה-Web App.";
  }
  if (error === "Not enough available equipment to issue") {
    return "אין מספיק פריטים זמינים להנפקה";
  }
  if (error === "Total quantity cannot be lower than currently issued quantity") {
    return "לא ניתן לעדכן כמות כוללת הנמוכה ממספר הפריטים שכבר מונפקים";
  }
  if (error === "Invalid equipment quantity") {
    return "יש להזין כמות חוקית להנפקה";
  }
  if (error === "Invalid total quantity") {
    return "יש להזין כמות כוללת חוקית";
  }
  if (error === "Equipment not found") {
    return "הפריט שנבחר לא נמצא";
  }
  return error;
}

export const EquipmentPage: React.FC<Props> = ({ data, onRefresh }) => {
  const { equipmentTypes, equipmentLedger, departments } = data;
  const [selectedType, setSelectedType] = useState<EquipmentType | null>(null);
  const [actionItem, setActionItem] = useState<(EquipmentType & { available: number; issued: number }) | null>(null);
  const [actionMode, setActionMode] = useState<EquipmentActionMode>("set_quantity");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    totalQuantity: "0",
  });
  const [stockForm, setStockForm] = useState({
    quantity: "",
  });
  const [issueForm, setIssueForm] = useState({
    quantity: 1,
    issuedTo: "",
    department: "",
    expectedReturnDate: "",
  });

  // ── Overdue count ──────────────────────────────────────────────────
  const overdueCount = equipmentLedger.filter(
    (l) => l.status !== "returned" && isEquipmentOverdue(l.expectedReturnDate)
  ).length;

  // ── Type table with available qty ────────────────────────────────
  const typesWithQty = useMemo(() =>
    equipmentTypes.map((t) => ({
      ...t,
      available: calcAvailableQty(t.totalQuantity, equipmentLedger, t.id),
      issued: t.totalQuantity - calcAvailableQty(t.totalQuantity, equipmentLedger, t.id),
    })),
  [equipmentTypes, equipmentLedger]);

  // ── Ledger rows for selected type ────────────────────────────────
  const activeLedger = useMemo(() => {
    if (!selectedType) return [];
    return equipmentLedger.filter(
      (l) => l.equipmentId === selectedType.id && l.status !== "returned"
    );
  }, [selectedType, equipmentLedger]);

  const resetActionModal = () => {
    setActionItem(null);
    setActionMode("set_quantity");
    setActionError(null);
    setStockForm({ quantity: "" });
    setIssueForm({ quantity: 1, issuedTo: "", department: "", expectedReturnDate: "" });
  };

  const openActionModal = (item: EquipmentType & { available: number; issued: number }) => {
    setActionItem(item);
    setActionMode("set_quantity");
    setActionError(null);
    setStockForm({ quantity: String(item.totalQuantity) });
    setIssueForm({
      quantity: item.available > 0 ? 1 : 0,
      issuedTo: "",
      department: departments[0]?.name ?? "",
      expectedReturnDate: "",
    });
  };

  const handleEquipmentAction = async () => {
    if (!actionItem) return;

    setIsSubmittingAction(true);
    setActionError(null);

    if (actionMode === "set_quantity") {
      const nextQuantity = Number(stockForm.quantity);

      if (Number.isNaN(nextQuantity) || nextQuantity < 0) {
        setActionError("יש להזין כמות חוקית");
        setIsSubmittingAction(false);
        return;
      }

      const result = await api.setEquipmentStockDetailed(actionItem.id, nextQuantity);
      if (!result.data) {
        setActionError(formatEquipmentActionError(result.error || "עדכון הכמות נכשל"));
        setIsSubmittingAction(false);
        return;
      }
    }

    if (actionMode === "issue_item") {
      const issueQuantity = Number(issueForm.quantity);
      if (Number.isNaN(issueQuantity) || issueQuantity <= 0) {
        setActionError("יש להזין כמות חוקית להנפקה");
        setIsSubmittingAction(false);
        return;
      }
      if (issueQuantity > actionItem.available) {
        setActionError("אין מספיק פריטים זמינים להנפקה");
        setIsSubmittingAction(false);
        return;
      }
      if (!issueForm.issuedTo.trim()) {
        setActionError("יש להזין למי הפריט מונפק");
        setIsSubmittingAction(false);
        return;
      }

      const result = await api.issueEquipmentDetailed({
        equipmentId: actionItem.id,
        quantity: issueQuantity,
        issuedTo: issueForm.issuedTo.trim(),
        department: issueForm.department,
        expectedReturnDate: issueForm.expectedReturnDate || undefined,
      });

      if (!result.data) {
        setActionError(formatEquipmentActionError(result.error || "הנפקת הפריט נכשלה"));
        setIsSubmittingAction(false);
        return;
      }
    }

    await onRefresh();
    setIsSubmittingAction(false);
    resetActionModal();
  };

  const handleReturn = async (ledgerId: string) => {
    await api.returnEquipment(ledgerId);
    onRefresh();
  };

  const handleCreateEquipment = async () => {
    const name = createForm.name.trim();
    const totalQuantity = Number(createForm.totalQuantity);

    if (!name) {
      setCreateError("יש להזין שם פריט");
      return;
    }
    if (Number.isNaN(totalQuantity) || totalQuantity < 0) {
      setCreateError("יש להזין כמות התחלתית חוקית");
      return;
    }

    const duplicate = equipmentTypes.some(
      (type) => type.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase()
    );
    if (duplicate) {
      setCreateError("פריט בשם הזה כבר קיים במערכת");
      return;
    }

    setIsCreating(true);
    setCreateError(null);

    const result = await api.createEquipmentTypeDetailed({
      name,
      totalQuantity,
    });

    if (!result.data) {
      setCreateError(formatEquipmentCreateError(result.error));
      setIsCreating(false);
      return;
    }

    setCreateModalOpen(false);
    setCreateForm({ name: "", totalQuantity: "0" });
    setIsCreating(false);
    await onRefresh();
  };

  // ── Ledger columns ────────────────────────────────────────────────
  const ledgerColumns = [
    {
      key: "equipmentName",
      header: "פריט",
      render: (l: EquipmentLedgerEntry) => (
        <span className="font-medium">{l.equipmentName}</span>
      ),
    },
    { key: "quantity", header: "כמות" },
    { key: "issuedTo", header: "מושאל ל" },
    { key: "department", header: "מחלקה" },
    { key: "issueDate", header: "תאריך הוצאה", render: (l: EquipmentLedgerEntry) => formatDate(l.issueDate) },
    {
      key: "expectedReturnDate",
      header: "החזרה צפויה",
      render: (l: EquipmentLedgerEntry) => {
        const overdue = isEquipmentOverdue(l.expectedReturnDate);
        return (
          <span className={overdue ? "text-status-danger-text font-bold" : ""}>
            {formatDate(l.expectedReturnDate)}
            {overdue && " ⚠"}
          </span>
        );
      },
    },
    {
      key: "status",
      header: "סטטוס",
      render: (l: EquipmentLedgerEntry) => (
        <Badge variant={equipmentStatusVariant(l.status)}>
          {equipmentStatusLabel(l.status)}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "פעולות",
      render: (l: EquipmentLedgerEntry) =>
        l.status !== "returned" ? (
          <button
            onClick={() => handleReturn(l.id)}
            className="text-xs text-status-success-text hover:underline font-medium"
          >
            סמן כהוחזר
          </button>
        ) : null,
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="ציוד חשמלי"
        subtitle="מעקב הוצאות, החזרות ומלאי ציוד"
        action={
          <button
            onClick={() => {
              setCreateModalOpen(true);
              setCreateError(null);
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
          >
            <Plus size={15} />
            הוספת פריט
          </button>
        }
      />

      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <SummaryCard label="סוגי ציוד" value={equipmentTypes.length} icon={<Zap size={18} />} />
        <SummaryCard
          label="פריטים מושאלים כעת"
          value={equipmentLedger.filter((l) => l.status !== "returned").length}
          variant="warning"
        />
        <SummaryCard
          label="באיחור"
          value={overdueCount}
          variant={overdueCount > 0 ? "danger" : "neutral"}
          icon={overdueCount > 0 ? <AlertTriangle size={18} /> : undefined}
        />
      </div>

      {/* Equipment Types table */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          מלאי לפי סוג
        </h3>
        <div className="overflow-hidden rounded-lg bg-card shadow-card">
          <div className="overflow-x-auto">
          <table className="min-w-[38rem] w-full text-sm" dir="rtl">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground sm:px-4">שם פריט</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground sm:px-4">סה״כ</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground sm:px-4">זמין</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground sm:px-4">מושאל</th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-muted-foreground sm:px-4">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {typesWithQty.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() => setSelectedType(t.id === selectedType?.id ? null : t)}
                >
                  <td className="px-3 py-3 font-semibold sm:px-4">{t.name}</td>
                  <td className="px-3 py-3 tabular-nums sm:px-4">{t.totalQuantity}</td>
                  <td className="px-3 py-3 tabular-nums sm:px-4">
                    <span className={t.available === 0 ? "text-status-danger-text font-bold" : "text-status-success-text font-bold"}>
                      {t.available}
                    </span>
                  </td>
                  <td className="px-3 py-3 tabular-nums sm:px-4">{t.issued}</td>
                  <td className="px-3 py-3 sm:px-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openActionModal(t);
                      }}
                      className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80"
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
      </section>

      {/* Active loans / detail */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          {selectedType ? `פריטים מושאלים: ${selectedType.name}` : "כל הפריטים המושאלים כעת"}
        </h3>
        <DataTable
          columns={ledgerColumns}
          data={
            selectedType
              ? activeLedger
              : equipmentLedger.filter((l) => l.status !== "returned")
          }
          rowKey={(l) => l.id}
          emptyMessage="אין פריטים מושאלים"
          minWidthClassName="min-w-[52rem]"
        />
      </section>

      <Modal
        open={!!actionItem}
        onClose={resetActionModal}
        title={`פעולה — ${actionItem?.name}`}
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              onClick={() => {
                setActionMode("set_quantity");
                setActionError(null);
              }}
              className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                actionMode === "set_quantity"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              הזן כמות חדשה
            </button>
            <button
              onClick={() => {
                setActionMode("issue_item");
                setActionError(null);
              }}
              className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                actionMode === "issue_item"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              נפק פריט
            </button>
          </div>

          {actionMode === "set_quantity" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg bg-muted/40 px-4 py-3">
                  <div className="text-xs text-muted-foreground">כמות כוללת נוכחית</div>
                  <div className="text-lg font-semibold tabular-nums">{actionItem?.totalQuantity ?? 0}</div>
                </div>
                <div className="rounded-lg bg-muted/40 px-4 py-3">
                  <div className="text-xs text-muted-foreground">מונפק כעת</div>
                  <div className="text-lg font-semibold tabular-nums">{actionItem?.issued ?? 0}</div>
                </div>
                <div className="rounded-lg bg-muted/40 px-4 py-3">
                  <div className="text-xs text-muted-foreground">זמין כרגע</div>
                  <div className="text-lg font-semibold tabular-nums">{actionItem?.available ?? 0}</div>
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">כמות חדשה במלאי</label>
                <input
                  type="number"
                  min={actionItem?.issued ?? 0}
                  step={1}
                  value={stockForm.quantity}
                  onChange={(e) => setStockForm({ quantity: e.target.value })}
                  className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <p className="text-xs text-muted-foreground">
                  הכמות נשמרת בקטלוג הציוד הכולל, ולכן לא ניתן לרדת מתחת ל-{actionItem?.issued ?? 0} פריטים שכבר מונפקים.
                </p>
              </div>
            </div>
          )}

          {actionMode === "issue_item" && (
            <>
              <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                זמינים כעת להנפקה: <span className="font-semibold text-foreground tabular-nums">{actionItem?.available ?? 0}</span>
              </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">כמות</label>
            <input
              type="number"
              min={1}
              max={actionItem?.available || 1}
              value={issueForm.quantity}
              onChange={(e) => setIssueForm({ ...issueForm, quantity: Number(e.target.value) })}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">מושאל ל</label>
            <input
              type="text"
              value={issueForm.issuedTo}
              onChange={(e) => setIssueForm({ ...issueForm, issuedTo: e.target.value })}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              dir="rtl"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">מחלקה</label>
            <select
              value={issueForm.department}
              onChange={(e) => setIssueForm({ ...issueForm, department: e.target.value })}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              dir="rtl"
            >
              <option value="">בחר מחלקה</option>
              {departments.map((d) => <option key={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">תאריך החזרה צפוי (אופציונלי)</label>
            <input
              type="date"
              value={issueForm.expectedReturnDate}
              onChange={(e) => setIssueForm({ ...issueForm, expectedReturnDate: e.target.value })}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
            </>
          )}

          {actionError && (
            <p className="text-sm text-status-danger-text">{actionError}</p>
          )}

          <div className="mt-2 flex flex-col-reverse gap-3 sm:flex-row">
            <button
              onClick={handleEquipmentAction}
              disabled={isSubmittingAction}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
            >
              {isSubmittingAction
                ? "שומר..."
                : actionMode === "set_quantity"
                  ? "שמור כמות"
                  : "אשר הנפקה"}
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

      <Modal
        open={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setCreateError(null);
        }}
        title="הוספת פריט ציוד חדש"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">שם פריט</label>
            <input
              type="text"
              value={createForm.name}
              onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              dir="rtl"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">כמות התחלתית במלאי</label>
            <input
              type="number"
              min={0}
              step={1}
              value={createForm.totalQuantity}
              onChange={(e) => setCreateForm({ ...createForm, totalQuantity: e.target.value })}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              הכמות נשמרת בקטלוג הציוד ומשמשת לחישוב המלאי הזמין מול ההוצאות הפעילות.
            </p>
          </div>
          {createError && (
            <p className="text-sm text-status-danger-text">{createError}</p>
          )}
          <div className="flex gap-3 mt-2">
            <button
              onClick={handleCreateEquipment}
              disabled={isCreating}
              className="bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {isCreating ? "שומר..." : "שמור פריט"}
            </button>
            <button
              onClick={() => {
                setCreateModalOpen(false);
                setCreateError(null);
              }}
              className="text-sm font-medium text-muted-foreground px-4 py-2 rounded-md hover:bg-muted transition-colors"
            >
              ביטול
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
