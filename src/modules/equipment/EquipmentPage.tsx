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

import React, { useEffect, useMemo, useState } from "react";
import { InitialData, EquipmentType, EquipmentLedgerEntry, Employee } from "@/types";
import { Badge } from "@/components/shared/Badge";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { Modal } from "@/components/shared/Modal";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import {
  calcAvailableQty,
  employeeStatusLabel,
  employeeStatusVariant,
  equipmentStatusLabel,
  equipmentStatusVariant,
  formatDate,
  getReserveStatus,
  isEquipmentOverdue,
} from "@/utils";
import { api } from "@/api";
import { Zap, AlertTriangle, Plus, ArrowRightLeft, Search } from "lucide-react";

interface Props { data: InitialData; onRefresh: () => void; }

type EquipmentActionMode = "set_quantity" | "issue_item";
type EquipmentSection = "issued_items" | "assign_by_name";
type EquipmentTypeWithQty = EquipmentType & { available: number; issued: number };

function isLedgerAssignedToEmployee(entry: EquipmentLedgerEntry, employee: Employee): boolean {
  if (entry.status === "returned") return false;
  if (entry.employeeId) {
    return entry.employeeId === employee.id;
  }
  return entry.issuedTo === employee.name;
}

function getEmployeeEquipmentWarning(employee?: Employee, activeLoansCount = 0) {
  if (!employee || activeLoansCount <= 0) return null;

  if (employee.status === "inactive") {
    return {
      variant: "danger" as const,
      label: "עובד לא פעיל",
      message: "העובד מסומן כלא פעיל אך עדיין יש עליו ציוד מושאל.",
    };
  }

  const reserveStatus = getReserveStatus(employee.status, employee.reserveEndDate);
  if (reserveStatus === "reserve_ended") {
    return {
      variant: "danger" as const,
      label: "מילואים הסתיימו",
      message: "תקופת המילואים של העובד הסתיימה ועדיין יש עליו ציוד מושאל.",
    };
  }

  if (reserveStatus === "reserve_ending_soon") {
    return {
      variant: "warning" as const,
      label: "מילואים מסתיימים בקרוב",
      message: "יש ציוד מושאל לעובד שתקופת המילואים שלו עומדת להסתיים בקרוב.",
    };
  }

  return null;
}

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
  if (error.startsWith("Unknown action: syncEmployeeEquipmentAssignments")) {
    return "ה-endpoint המחובר ב-Google Apps Script לא מכיל עדיין את syncEmployeeEquipmentAssignments. יש לפרוס מחדש את ה-Web App או לעדכן את VITE_GAS_URL לפריסה העדכנית.";
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
  if (error === "Employee not found") {
    return "העובד שנבחר לא נמצא";
  }
  if (error === "Missing employee ID") {
    return "יש לבחור עובד לפני שמירת ההחתמה";
  }
  return error;
}

export const EquipmentPage: React.FC<Props> = ({ data, onRefresh }) => {
  const { equipmentTypes, equipmentLedger, departments, employees } = data;
  const [activeSection, setActiveSection] = useState<EquipmentSection>("issued_items");
  const [selectedType, setSelectedType] = useState<EquipmentType | null>(null);
  const [actionItem, setActionItem] = useState<EquipmentTypeWithQty | null>(null);
  const [actionMode, setActionMode] = useState<EquipmentActionMode>("set_quantity");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [issuedToSearch, setIssuedToSearch] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [employeeSearchQuery, setEmployeeSearchQuery] = useState("");
  const [employeeSearchFocused, setEmployeeSearchFocused] = useState(false);
  const [employeeEquipmentSearch, setEmployeeEquipmentSearch] = useState("");
  const [assignmentDraft, setAssignmentDraft] = useState<Record<string, number>>({});
  const [assignmentDetails, setAssignmentDetails] = useState({
    department: "",
    expectedReturnDate: "",
  });
  const [assignmentDetailsBaseline, setAssignmentDetailsBaseline] = useState({
    department: "",
    expectedReturnDate: "",
  });
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [isSyncingAssignments, setIsSyncingAssignments] = useState(false);
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
    employeeId: "",
    department: "",
    expectedReturnDate: "",
  });

  const sortedEmployees = useMemo(
    () => [...employees].sort((a, b) => a.name.localeCompare(b.name, "he")),
    [employees]
  );
  const employeeById = useMemo(
    () => new Map(sortedEmployees.map((employee) => [employee.id, employee])),
    [sortedEmployees]
  );
  const employeeByName = useMemo(
    () => new Map(sortedEmployees.map((employee) => [employee.name, employee])),
    [sortedEmployees]
  );

  // ── Overdue count ──────────────────────────────────────────────────
  const overdueCount = equipmentLedger.filter(
    (l) => l.status !== "returned" && isEquipmentOverdue(l.expectedReturnDate)
  ).length;

  // ── Type table with available qty ────────────────────────────────
  const typesWithQty = useMemo<EquipmentTypeWithQty[]>(() =>
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

  const activeLedgerRows = useMemo(() => {
    const normalizedSearch = issuedToSearch.trim();
    const rows = selectedType
      ? activeLedger
      : equipmentLedger.filter((l) => l.status !== "returned");

    if (!normalizedSearch) return rows;

    return rows.filter((entry) =>
      entry.issuedTo.includes(normalizedSearch) ||
      entry.department.includes(normalizedSearch) ||
      entry.equipmentName.includes(normalizedSearch)
    );
  }, [activeLedger, equipmentLedger, issuedToSearch, selectedType]);

  const selectedEmployee = useMemo(
    () => employeeById.get(selectedEmployeeId) ?? null,
    [employeeById, selectedEmployeeId]
  );

  const filteredEmployeeOptions = useMemo(() => {
    const normalizedSearch = employeeSearchQuery.trim();
    if (!normalizedSearch) {
      return sortedEmployees.slice(0, 8);
    }

    return sortedEmployees
      .filter((employee) =>
        employee.name.includes(normalizedSearch) ||
        employee.department.includes(normalizedSearch)
      )
      .slice(0, 8);
  }, [employeeSearchQuery, sortedEmployees]);

  const selectedEmployeeActiveLedger = useMemo(() => {
    if (!selectedEmployee) return [];
    return equipmentLedger.filter((entry) => isLedgerAssignedToEmployee(entry, selectedEmployee));
  }, [equipmentLedger, selectedEmployee]);

  const selectedEmployeeCurrentByEquipment = useMemo(() => {
    const map = new Map<string, number>();
    selectedEmployeeActiveLedger.forEach((entry) => {
      map.set(entry.equipmentId, (map.get(entry.equipmentId) ?? 0) + entry.quantity);
    });
    return map;
  }, [selectedEmployeeActiveLedger]);

  const selectedEmployeeActiveUnits = useMemo(
    () => selectedEmployeeActiveLedger.reduce((sum, entry) => sum + entry.quantity, 0),
    [selectedEmployeeActiveLedger]
  );

  const selectedEmployeeWarning = useMemo(
    () => getEmployeeEquipmentWarning(selectedEmployee ?? undefined, selectedEmployeeActiveUnits),
    [selectedEmployee, selectedEmployeeActiveUnits]
  );

  const selectedEmployeeActiveDepartments = useMemo(
    () =>
      Array.from(
        new Set(
          selectedEmployeeActiveLedger
            .map((entry) => entry.department.trim())
            .filter(Boolean)
        )
      ),
    [selectedEmployeeActiveLedger]
  );

  const selectedEmployeeActiveExpectedReturnDates = useMemo(
    () =>
      Array.from(
        new Set(
          selectedEmployeeActiveLedger.map((entry) => entry.expectedReturnDate || "")
        )
      ),
    [selectedEmployeeActiveLedger]
  );

  const hasMixedActiveDepartments = selectedEmployeeActiveDepartments.length > 1;
  const hasMixedActiveExpectedReturnDates = selectedEmployeeActiveExpectedReturnDates.length > 1;

  useEffect(() => {
    if (!selectedEmployee) {
      setAssignmentDraft({});
      setAssignmentDetails({ department: "", expectedReturnDate: "" });
      setAssignmentDetailsBaseline({ department: "", expectedReturnDate: "" });
      setAssignmentError(null);
      return;
    }

    const nextDraft: Record<string, number> = {};
    equipmentTypes.forEach((equipment) => {
      nextDraft[equipment.id] = selectedEmployeeCurrentByEquipment.get(equipment.id) ?? 0;
    });

    const nextDepartment =
      selectedEmployeeActiveDepartments.length === 1
        ? selectedEmployeeActiveDepartments[0]
        : selectedEmployee.department;
    const nextExpectedReturnDate =
      selectedEmployeeActiveExpectedReturnDates.length === 1
        ? selectedEmployeeActiveExpectedReturnDates[0]
        : "";

    setAssignmentDraft(nextDraft);
    setAssignmentDetails({
      department: nextDepartment,
      expectedReturnDate: nextExpectedReturnDate,
    });
    setAssignmentDetailsBaseline({
      department: nextDepartment,
      expectedReturnDate: nextExpectedReturnDate,
    });
    setAssignmentError(null);
  }, [
    equipmentTypes,
    selectedEmployee,
    selectedEmployeeActiveDepartments,
    selectedEmployeeActiveExpectedReturnDates,
    selectedEmployeeCurrentByEquipment,
  ]);

  const allAssignmentRows = useMemo(
    () =>
      typesWithQty.map((equipment) => {
        const currentQuantity = selectedEmployeeCurrentByEquipment.get(equipment.id) ?? 0;
        const targetQuantity = assignmentDraft[equipment.id] ?? currentQuantity;
        const maxTargetQuantity = currentQuantity + equipment.available;
        return {
          ...equipment,
          currentQuantity,
          targetQuantity,
          maxTargetQuantity,
          delta: targetQuantity - currentQuantity,
        };
      }),
    [assignmentDraft, selectedEmployeeCurrentByEquipment, typesWithQty]
  );

  const assignmentRows = useMemo(() => {
    const normalizedSearch = employeeEquipmentSearch.trim();
    return allAssignmentRows.filter(
      (equipment) => !normalizedSearch || equipment.name.includes(normalizedSearch)
    );
  }, [allAssignmentRows, employeeEquipmentSearch]);

  const pendingAssignmentChanges = useMemo(
    () => allAssignmentRows.filter((row) => row.delta !== 0),
    [allAssignmentRows]
  );

  const hasAssignmentMetadataChanges = useMemo(() => {
    if (!selectedEmployee) return false;
    return (
      assignmentDetails.department.trim() !== assignmentDetailsBaseline.department.trim() ||
      (assignmentDetails.expectedReturnDate || "") !== (assignmentDetailsBaseline.expectedReturnDate || "")
    );
  }, [assignmentDetails, assignmentDetailsBaseline, selectedEmployee]);

  const resetActionModal = () => {
    setActionItem(null);
    setActionMode("set_quantity");
    setActionError(null);
    setStockForm({ quantity: "" });
    setIssueForm({ quantity: 1, issuedTo: "", employeeId: "", department: "", expectedReturnDate: "" });
  };

  const openActionModal = (item: EquipmentTypeWithQty) => {
    setActionItem(item);
    setActionMode("set_quantity");
    setActionError(null);
    setStockForm({ quantity: String(item.totalQuantity) });
    setIssueForm({
      quantity: item.available > 0 ? 1 : 0,
      issuedTo: "",
      employeeId: "",
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
      const normalizedIssuedTo = issueForm.issuedTo.trim();
      const matchedEmployee = employeeByName.get(normalizedIssuedTo);
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
      if (!normalizedIssuedTo) {
        setActionError("יש להזין למי הפריט מונפק");
        setIsSubmittingAction(false);
        return;
      }

      const result = await api.issueEquipmentDetailed({
        equipmentId: actionItem.id,
        quantity: issueQuantity,
        issuedTo: normalizedIssuedTo,
        employeeId: issueForm.employeeId || matchedEmployee?.id,
        department: issueForm.department || matchedEmployee?.department || "",
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

  const handleEmployeeSearchChange = (value: string) => {
    setEmployeeSearchQuery(value);
    setEmployeeSearchFocused(true);

    const normalizedValue = value.trim();
    const exactMatch = sortedEmployees.find(
      (employee) => employee.name.trim() === normalizedValue
    );

    if (exactMatch) {
      setSelectedEmployeeId(exactMatch.id);
      return;
    }

    setSelectedEmployeeId("");
  };

  const selectEmployeeFromSearch = (employee: Employee) => {
    setSelectedEmployeeId(employee.id);
    setEmployeeSearchQuery(employee.name);
    setEmployeeSearchFocused(false);
  };

  const updateAssignmentDraft = (equipmentId: string, nextQuantity: number) => {
    const row = typesWithQty.find((equipment) => equipment.id === equipmentId);
    const currentQuantity = selectedEmployeeCurrentByEquipment.get(equipmentId) ?? 0;
    const maxTargetQuantity = currentQuantity + (row?.available ?? 0);
    const normalizedQuantity = Math.max(0, Math.min(maxTargetQuantity, Number.isFinite(nextQuantity) ? nextQuantity : 0));

    setAssignmentDraft((current) => ({
      ...current,
      [equipmentId]: normalizedQuantity,
    }));
  };

  const handleSyncEmployeeAssignments = async () => {
    if (!selectedEmployee) {
      setAssignmentError("יש לבחור עובד לפני שמירת ההחתמה");
      return;
    }

    setIsSyncingAssignments(true);
    setAssignmentError(null);

    const result = await api.syncEmployeeEquipmentAssignmentsDetailed({
      employeeId: selectedEmployee.id,
      department: assignmentDetails.department.trim() || selectedEmployee.department,
      expectedReturnDate: assignmentDetails.expectedReturnDate || undefined,
      applyMetadataToExisting: hasAssignmentMetadataChanges,
      assignments: equipmentTypes.map((equipment) => ({
        equipmentId: equipment.id,
        targetQuantity: assignmentDraft[equipment.id] ?? selectedEmployeeCurrentByEquipment.get(equipment.id) ?? 0,
      })),
    });

    if (!result.data) {
      setAssignmentError(formatEquipmentActionError(result.error));
      setIsSyncingAssignments(false);
      return;
    }

    await onRefresh();
    setIsSyncingAssignments(false);
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
    {
      key: "issuedTo",
      header: "מושאל ל",
      render: (l: EquipmentLedgerEntry) => {
        const linkedEmployee = l.employeeId
          ? employeeById.get(l.employeeId) ?? null
          : employeeByName.get(l.issuedTo) ?? null;
        const warning = getEmployeeEquipmentWarning(linkedEmployee ?? undefined, l.quantity);
        const missingEmployee = !!l.employeeId && !linkedEmployee;

        return (
          <div className="flex flex-col gap-1">
            <span className="font-medium text-foreground">{l.issuedTo}</span>
            {warning && <Badge variant={warning.variant}>{warning.label}</Badge>}
            {missingEmployee && <Badge variant="danger">לא נמצא במאגר עובדים</Badge>}
          </div>
        );
      },
    },
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

  const assignmentColumns = [
    {
      key: "name",
      header: "פריט",
      render: (equipment: typeof assignmentRows[number]) => (
        <div className="flex flex-col gap-1">
          <span className="font-medium text-foreground">{equipment.name}</span>
          {equipment.delta !== 0 && (
            <Badge variant={equipment.delta > 0 ? "success" : "warning"}>
              {equipment.delta > 0 ? `יונפקו ${equipment.delta}` : `יוחזרו ${Math.abs(equipment.delta)}`}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: "available",
      header: "זמין להוספה",
      render: (equipment: typeof assignmentRows[number]) => (
        <span className={equipment.available === 0 ? "font-bold text-status-danger-text" : "font-bold text-status-success-text"}>
          {equipment.available}
        </span>
      ),
    },
    {
      key: "currentQuantity",
      header: "כעת אצל העובד",
      render: (equipment: typeof assignmentRows[number]) => equipment.currentQuantity,
    },
    {
      key: "targetQuantity",
      header: "כמות רצויה",
      render: (equipment: typeof assignmentRows[number]) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => updateAssignmentDraft(equipment.id, equipment.targetQuantity - 1)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-sm font-semibold transition-colors hover:bg-muted"
          >
            -
          </button>
          <input
            type="number"
            min={0}
            max={equipment.maxTargetQuantity}
            value={equipment.targetQuantity}
            onChange={(event) => updateAssignmentDraft(equipment.id, Number(event.target.value))}
            className="h-8 w-20 rounded-md border border-border bg-background px-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={() => updateAssignmentDraft(equipment.id, equipment.targetQuantity + 1)}
            disabled={equipment.targetQuantity >= equipment.maxTargetQuantity}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border text-sm font-semibold transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            +
          </button>
        </div>
      ),
    },
    {
      key: "maxTargetQuantity",
      header: "מקסימום אפשרי",
      render: (equipment: typeof assignmentRows[number]) => equipment.maxTargetQuantity,
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

      <section className="space-y-4">
        <div className="flex flex-col gap-3 border-b border-border pb-2 xl:flex-row xl:items-end xl:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveSection("issued_items");
                setAssignmentError(null);
              }}
              className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                activeSection === "issued_items"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              פריטים מושאלים
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveSection("assign_by_name");
                setActionError(null);
              }}
              className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                activeSection === "assign_by_name"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              החתמה לפי שם
            </button>
          </div>

          {activeSection === "assign_by_name" && (
            <button
              type="button"
              onClick={handleSyncEmployeeAssignments}
              disabled={
                !selectedEmployee ||
                (pendingAssignmentChanges.length === 0 && !hasAssignmentMetadataChanges) ||
                isSyncingAssignments
              }
              className="inline-flex w-full items-center justify-center gap-2 self-start rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto xl:self-auto"
            >
              {isSyncingAssignments
                ? "שומר..."
                : `שמור שינויים${pendingAssignmentChanges.length > 0 ? ` (${pendingAssignmentChanges.length})` : ""}`}
            </button>
          )}
        </div>

        {activeSection === "issued_items" ? (
          <>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {selectedType ? `פריטים מושאלים: ${selectedType.name}` : "כל הפריטים המושאלים כעת"}
                </h3>
                {issuedToSearch.trim() && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    נמצאו {activeLedgerRows.length} רשומות פעילות עבור "{issuedToSearch.trim()}"
                  </p>
                )}
              </div>
              <SearchInput
                value={issuedToSearch}
                onChange={setIssuedToSearch}
                placeholder="חיפוש לפי עובד, מחלקה או פריט..."
                className="w-full lg:w-80"
              />
            </div>
            <DataTable
              columns={ledgerColumns}
              data={activeLedgerRows}
              rowKey={(l) => l.id}
              emptyMessage={
                issuedToSearch.trim()
                  ? "לא נמצאו פריטים מושאלים עבור החיפוש הזה"
                  : "אין פריטים מושאלים"
              }
              minWidthClassName="min-w-[56rem]"
            />
          </>
        ) : (
          <div className="space-y-4 rounded-lg bg-card p-4 shadow-card sm:p-5">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">בחירת עובד</label>
                <div className="relative">
                  <Search
                    size={15}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="text"
                    value={employeeSearchQuery}
                    onChange={(event) => handleEmployeeSearchChange(event.target.value)}
                    onFocus={() => setEmployeeSearchFocused(true)}
                    onBlur={() => {
                      window.setTimeout(() => {
                        setEmployeeSearchFocused(false);
                      }, 120);
                    }}
                    placeholder="הקלד שם עובד..."
                    className="h-10 w-full rounded-md border border-border bg-background pl-3 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    dir="rtl"
                  />

                  {employeeSearchFocused && (
                    <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border border-border bg-card shadow-card">
                      {filteredEmployeeOptions.length > 0 ? (
                        filteredEmployeeOptions.map((employee) => (
                          <button
                            key={employee.id}
                            type="button"
                            onMouseDown={(event) => {
                              event.preventDefault();
                              selectEmployeeFromSearch(employee);
                            }}
                            className={`flex w-full flex-col items-start gap-1 px-3 py-2 text-right text-sm transition-colors hover:bg-muted ${
                              selectedEmployeeId === employee.id ? "bg-primary/5" : ""
                            }`}
                          >
                            <span className="font-medium text-foreground">{employee.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {employee.department}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-3 text-sm text-muted-foreground">
                          לא נמצא עובד תואם במאגר.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  הקלד כדי לחפש, ולאחר מכן בחר עובד קיים מהרשימה המסוננת.
                </p>
              </div>

              <SearchInput
                value={employeeEquipmentSearch}
                onChange={setEmployeeEquipmentSearch}
                placeholder="חיפוש פריט לפי שם..."
                className="w-full"
              />
            </div>

            {!selectedEmployee ? (
              <div className="rounded-lg border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-muted-foreground">
                בחר עובד מהרשימה כדי להחתים או להסיר עבורו ציוד ממאגר העובדים הקיים.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                  <div className="rounded-lg bg-muted/40 px-4 py-3">
                    <div className="text-xs text-muted-foreground">עובד נבחר</div>
                    <div className="mt-1 font-semibold text-foreground">{selectedEmployee.name}</div>
                    <div className="text-xs text-muted-foreground">{selectedEmployee.department}</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-4 py-3">
                    <div className="text-xs text-muted-foreground">סטטוס עובד</div>
                    <div className="mt-2">
                      <Badge variant={employeeStatusVariant(selectedEmployee.status)}>
                        {employeeStatusLabel(selectedEmployee.status)}
                      </Badge>
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-4 py-3">
                    <div className="text-xs text-muted-foreground">יחידות פעילות</div>
                    <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">{selectedEmployeeActiveUnits}</div>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-4 py-3">
                    <div className="text-xs text-muted-foreground">שינויים ממתינים</div>
                    <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">{pendingAssignmentChanges.length}</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-background px-4 py-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,14rem)_minmax(0,1fr)]">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">מחלקה להנפקה</label>
                    <select
                      value={assignmentDetails.department}
                      onChange={(event) =>
                        setAssignmentDetails((current) => ({
                          ...current,
                          department: event.target.value,
                        }))
                      }
                      className="h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      dir="rtl"
                    >
                      <option value="">בחר מחלקה</option>
                      {departments.map((department) => (
                        <option key={department.id} value={department.name}>
                          {department.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      ברירת המחדל נשענת על העובד או על ההשאלות הפעילות הקיימות שלו.
                    </p>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">תאריך החזרה צפוי</label>
                    <input
                      type="date"
                      value={assignmentDetails.expectedReturnDate}
                      onChange={(event) =>
                        setAssignmentDetails((current) => ({
                          ...current,
                          expectedReturnDate: event.target.value,
                        }))
                      }
                      className="h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <p className="text-xs text-muted-foreground">
                      יחול על הנפקות חדשות ובשמירה יעדכן גם השאלות פעילות של אותו עובד.
                    </p>
                  </div>

                  <div className="rounded-lg bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
                    <div className="font-medium text-foreground">פרטי ההנפקה לעובד</div>
                    <div className="mt-2 space-y-1">
                      <p>הכמויות נשארות ברמת כל פריט בטבלה, בדיוק כמו עכשיו.</p>
                      <p>המחלקה ותאריך ההחזרה שומרו יחד עם ה-ledger האמיתי ולא רק מקומית.</p>
                      {hasMixedActiveDepartments && (
                        <p>לעובד קיימות כרגע השאלות עם מחלקות שונות. שמירה תיישר אותן למחלקה שנבחרה.</p>
                      )}
                      {hasMixedActiveExpectedReturnDates && (
                        <p>לעובד קיימים כרגע תאריכי החזרה שונים. שמירה תיישר אותם לתאריך שנבחר.</p>
                      )}
                    </div>
                  </div>
                </div>

                {selectedEmployeeWarning && (
                  <div
                    className={`rounded-lg border px-4 py-3 text-sm ${
                      selectedEmployeeWarning.variant === "danger"
                        ? "border-status-danger-text/20 bg-status-danger-bg text-status-danger-text"
                        : "border-status-warning-text/20 bg-status-warning-bg text-status-warning-text"
                    }`}
                  >
                    <div className="font-semibold">{selectedEmployeeWarning.label}</div>
                    <div className="mt-1">{selectedEmployeeWarning.message}</div>
                  </div>
                )}

                <DataTable
                  columns={assignmentColumns}
                  data={assignmentRows}
                  rowKey={(equipment) => equipment.id}
                  emptyMessage={
                    employeeEquipmentSearch.trim()
                      ? "לא נמצאו פריטי ציוד עבור החיפוש הזה"
                      : "אין פריטי ציוד להצגה"
                  }
                  minWidthClassName="min-w-[64rem]"
                />

                {assignmentError && (
                  <p className="text-sm text-status-danger-text">{assignmentError}</p>
                )}
              </>
            )}
          </div>
        )}
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
