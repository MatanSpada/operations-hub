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
import { Zap, AlertTriangle } from "lucide-react";

interface Props { data: InitialData; onRefresh: () => void; }

export const EquipmentPage: React.FC<Props> = ({ data, onRefresh }) => {
  const { equipmentTypes, equipmentLedger, departments } = data;
  const [selectedType, setSelectedType] = useState<EquipmentType | null>(null);
  const [issueModal, setIssueModal] = useState<EquipmentType | null>(null);
  const [form, setForm] = useState({
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

  const handleIssue = async () => {
    if (!issueModal) return;
    await api.issueEquipment({
      equipmentId: issueModal.id,
      quantity: form.quantity,
      issuedTo: form.issuedTo,
      department: form.department,
      expectedReturnDate: form.expectedReturnDate || undefined,
    });
    setIssueModal(null);
    setForm({ quantity: 1, issuedTo: "", department: "", expectedReturnDate: "" });
    onRefresh();
  };

  const handleReturn = async (ledgerId: string) => {
    await api.returnEquipment(ledgerId);
    onRefresh();
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
      <PageHeader title="ציוד חשמלי" subtitle="מעקב הוצאות, החזרות ומלאי ציוד" />

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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
        <div className="bg-card rounded-lg shadow-card overflow-hidden">
          <table className="w-full text-sm" dir="rtl">
            <thead>
              <tr className="bg-muted border-b border-border">
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">שם פריט</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">סה״כ</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">זמין</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">מושאל</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {typesWithQty.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() => setSelectedType(t.id === selectedType?.id ? null : t)}
                >
                  <td className="px-4 py-3 font-semibold">{t.name}</td>
                  <td className="px-4 py-3 tabular-nums">{t.totalQuantity}</td>
                  <td className="px-4 py-3 tabular-nums">
                    <span className={t.available === 0 ? "text-status-danger-text font-bold" : "text-status-success-text font-bold"}>
                      {t.available}
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums">{t.issued}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); setIssueModal(t); }}
                      className="text-xs text-primary hover:underline font-medium"
                    >
                      הוצא
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
        />
      </section>

      {/* Issue Equipment Modal */}
      <Modal
        open={!!issueModal}
        onClose={() => setIssueModal(null)}
        title={`הוצאת ציוד — ${issueModal?.name}`}
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">כמות</label>
            <input
              type="number"
              min={1}
              max={issueModal?.totalQuantity}
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">מושאל ל</label>
            <input
              type="text"
              value={form.issuedTo}
              onChange={(e) => setForm({ ...form, issuedTo: e.target.value })}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              dir="rtl"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">מחלקה</label>
            <select
              value={form.department}
              onChange={(e) => setForm({ ...form, department: e.target.value })}
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
              value={form.expectedReturnDate}
              onChange={(e) => setForm({ ...form, expectedReturnDate: e.target.value })}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex gap-3 mt-2">
            <button
              onClick={handleIssue}
              className="bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 transition-opacity"
            >
              אשר הוצאה
            </button>
            <button
              onClick={() => setIssueModal(null)}
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
