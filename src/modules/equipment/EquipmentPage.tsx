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

import React, { useEffect, useMemo, useRef, useState } from "react";
import { InitialData, EquipmentType, EquipmentLedgerEntry, Employee } from "@/types";
import { Badge } from "@/components/shared/Badge";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { Modal } from "@/components/shared/Modal";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { TablePagination } from "@/components/shared/TablePagination";
import { DateDisplayInput } from "@/components/shared/DateDisplayInput";
import {
  calcAvailableQty,
  equipmentStatusLabel,
  equipmentStatusVariant,
  formatDate,
  getReserveStatus,
  isEquipmentOverdue,
} from "@/utils";
import { api } from "@/api";
import { Zap, AlertTriangle, Plus, ArrowRightLeft } from "lucide-react";

interface Props { data: InitialData; onRefresh: () => void; }

type EquipmentActionMode = "set_quantity" | "issue_item";
type EquipmentSection = "issued_items" | "assign_by_name";
type AssignmentViewMode = "assigned_items" | "add_items";
type EquipmentTypeWithQty = EquipmentType & { available: number; issued: number };
type TablePageSize = "all" | "10" | "20" | "30";

const PAGE_SIZE_OPTIONS: Array<{ value: TablePageSize; label: string }> = [
  { value: "all", label: "הכל" },
  { value: "10", label: "10" },
  { value: "20", label: "20" },
  { value: "30", label: "30" },
];

function getTotalPages(totalItems: number, pageSize: TablePageSize): number {
  if (pageSize === "all") return 1;
  return Math.max(1, Math.ceil(totalItems / Number(pageSize)));
}

function paginateRows<T>(rows: T[], currentPage: number, pageSize: TablePageSize): T[] {
  if (pageSize === "all") return rows;
  const pageSizeNumber = Number(pageSize);
  const startIndex = (currentPage - 1) * pageSizeNumber;
  return rows.slice(startIndex, startIndex + pageSizeNumber);
}

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
  if (error === "Missing issued-to name") {
    return "יש להזין שם חותם לפני שמירת ההחתמה";
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
  const [equipmentTypeSearch, setEquipmentTypeSearch] = useState("");
  const [equipmentTypePage, setEquipmentTypePage] = useState(1);
  const [equipmentTypePageSize, setEquipmentTypePageSize] = useState<TablePageSize>("10");
  const [issuedToSearch, setIssuedToSearch] = useState("");
  const [issuedItemsPage, setIssuedItemsPage] = useState(1);
  const [issuedItemsPageSize, setIssuedItemsPageSize] = useState<TablePageSize>("10");
  const [assignmentSignerName, setAssignmentSignerName] = useState("");
  const [employeeEquipmentSearch, setEmployeeEquipmentSearch] = useState("");
  const [assignmentTablePage, setAssignmentTablePage] = useState(1);
  const [assignmentTablePageSize, setAssignmentTablePageSize] = useState<TablePageSize>("10");
  const [assignmentDraft, setAssignmentDraft] = useState<Record<string, number>>({});
  const [assignmentViewMode, setAssignmentViewMode] = useState<AssignmentViewMode>("assigned_items");
  const [assignmentDetails, setAssignmentDetails] = useState({
    department: "",
    expectedReturnDate: "",
  });
  const [assignmentDetailsBaseline, setAssignmentDetailsBaseline] = useState({
    department: "",
    expectedReturnDate: "",
  });
  const [editingAssignedEquipmentId, setEditingAssignedEquipmentId] = useState<string | null>(null);
  const [assignedQuantityInput, setAssignedQuantityInput] = useState("");
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [isSyncingAssignments, setIsSyncingAssignments] = useState(false);
  const [showActionHolders, setShowActionHolders] = useState(false);
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
  const signerManagementRef = useRef<HTMLElement | null>(null);

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

  const filteredTypesWithQty = useMemo(() => {
    const normalizedSearch = equipmentTypeSearch.trim();
    if (!normalizedSearch) return typesWithQty;
    return typesWithQty.filter((equipment) => equipment.name.includes(normalizedSearch));
  }, [equipmentTypeSearch, typesWithQty]);

  const equipmentTypeTotalPages = useMemo(
    () => getTotalPages(filteredTypesWithQty.length, equipmentTypePageSize),
    [equipmentTypePageSize, filteredTypesWithQty.length]
  );

  const paginatedTypesWithQty = useMemo(
    () => paginateRows(filteredTypesWithQty, equipmentTypePage, equipmentTypePageSize),
    [equipmentTypePage, equipmentTypePageSize, filteredTypesWithQty]
  );

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

  const issuedItemsTotalPages = useMemo(
    () => getTotalPages(activeLedgerRows.length, issuedItemsPageSize),
    [activeLedgerRows.length, issuedItemsPageSize]
  );

  const paginatedActiveLedgerRows = useMemo(
    () => paginateRows(activeLedgerRows, issuedItemsPage, issuedItemsPageSize),
    [activeLedgerRows, issuedItemsPage, issuedItemsPageSize]
  );

  const normalizedAssignmentSignerName = assignmentSignerName.trim();
  const matchedSignerEmployee = useMemo(
    () => employeeByName.get(normalizedAssignmentSignerName) ?? null,
    [employeeByName, normalizedAssignmentSignerName]
  );

  const selectedEmployeeActiveLedger = useMemo(() => {
    if (!normalizedAssignmentSignerName) return [];
    return equipmentLedger.filter((entry) => {
      if (entry.status === "returned") return false;
      if (matchedSignerEmployee) {
        return isLedgerAssignedToEmployee(entry, matchedSignerEmployee);
      }
      return entry.issuedTo === normalizedAssignmentSignerName;
    });
  }, [equipmentLedger, matchedSignerEmployee, normalizedAssignmentSignerName]);

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
    () => getEmployeeEquipmentWarning(matchedSignerEmployee ?? undefined, selectedEmployeeActiveUnits),
    [matchedSignerEmployee, selectedEmployeeActiveUnits]
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

  const activeSignerSummaries = useMemo(() => {
    const groups = new Map<string, {
      key: string;
      name: string;
      employeeId?: string;
      department: string;
      assignedUnits: number;
    }>();

    equipmentLedger
      .filter((entry) => entry.status !== "returned")
      .forEach((entry) => {
        const key = entry.employeeId ? `employee:${entry.employeeId}` : `name:${entry.issuedTo}`;
        const current = groups.get(key);

        if (current) {
          current.assignedUnits += entry.quantity;
          if (!current.department && entry.department) {
            current.department = entry.department;
          }
          return;
        }

        groups.set(key, {
          key,
          name: entry.issuedTo,
          employeeId: entry.employeeId || undefined,
          department: entry.department,
          assignedUnits: entry.quantity,
        });
      });

    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name, "he"));
  }, [equipmentLedger]);

  const actionItemHolders = useMemo(() => {
    if (!actionItem) return [];

    const groups = new Map<string, {
      key: string;
      name: string;
      department: string;
      assignedUnits: number;
    }>();

    equipmentLedger
      .filter((entry) => entry.status !== "returned" && entry.equipmentId === actionItem.id)
      .forEach((entry) => {
        const key = entry.employeeId ? `employee:${entry.employeeId}` : `name:${entry.issuedTo}`;
        const current = groups.get(key);

        if (current) {
          current.assignedUnits += entry.quantity;
          if (!current.department && entry.department) {
            current.department = entry.department;
          }
          return;
        }

        groups.set(key, {
          key,
          name: entry.issuedTo,
          department: entry.department,
          assignedUnits: entry.quantity,
        });
      });

    return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name, "he"));
  }, [actionItem, equipmentLedger]);

  useEffect(() => {
    if (!normalizedAssignmentSignerName) {
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
        : matchedSignerEmployee?.department || "";
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
    normalizedAssignmentSignerName,
    selectedEmployeeActiveDepartments,
    selectedEmployeeActiveExpectedReturnDates,
    selectedEmployeeCurrentByEquipment,
    matchedSignerEmployee,
  ]);

  useEffect(() => {
    setEquipmentTypePage(1);
  }, [equipmentTypeSearch]);

  useEffect(() => {
    setIssuedItemsPage(1);
  }, [issuedToSearch, selectedType?.id]);

  useEffect(() => {
    setAssignmentTablePage(1);
  }, [assignmentSignerName, assignmentViewMode, employeeEquipmentSearch]);

  useEffect(() => {
    setEquipmentTypePage((currentPage) => Math.min(currentPage, equipmentTypeTotalPages));
  }, [equipmentTypeTotalPages]);

  useEffect(() => {
    setIssuedItemsPage((currentPage) => Math.min(currentPage, issuedItemsTotalPages));
  }, [issuedItemsTotalPages]);

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

  const assignedItemRows = useMemo(() => {
    const normalizedSearch = employeeEquipmentSearch.trim();
    return allAssignmentRows.filter((equipment) => {
      const isAssigned = equipment.currentQuantity > 0;
      if (!isAssigned) return false;
      return !normalizedSearch || equipment.name.includes(normalizedSearch);
    });
  }, [allAssignmentRows, employeeEquipmentSearch]);

  const activeAssignmentRows = assignmentViewMode === "assigned_items"
    ? assignedItemRows
    : assignmentRows;

  const assignmentTableTotalPages = useMemo(
    () => getTotalPages(activeAssignmentRows.length, assignmentTablePageSize),
    [activeAssignmentRows.length, assignmentTablePageSize]
  );

  const paginatedAssignmentRows = useMemo(
    () => paginateRows(assignmentRows, assignmentTablePage, assignmentTablePageSize),
    [assignmentRows, assignmentTablePage, assignmentTablePageSize]
  );

  const paginatedAssignedItemRows = useMemo(
    () => paginateRows(assignedItemRows, assignmentTablePage, assignmentTablePageSize),
    [assignedItemRows, assignmentTablePage, assignmentTablePageSize]
  );

  useEffect(() => {
    setAssignmentTablePage((currentPage) => Math.min(currentPage, assignmentTableTotalPages));
  }, [assignmentTableTotalPages]);

  const editingAssignedEquipment = useMemo(
    () => allAssignmentRows.find((equipment) => equipment.id === editingAssignedEquipmentId) ?? null,
    [allAssignmentRows, editingAssignedEquipmentId]
  );

  const hasAssignmentMetadataChanges = useMemo(() => {
    if (!normalizedAssignmentSignerName) return false;
    return (
      assignmentDetails.department.trim() !== assignmentDetailsBaseline.department.trim() ||
      (assignmentDetails.expectedReturnDate || "") !== (assignmentDetailsBaseline.expectedReturnDate || "")
    );
  }, [assignmentDetails, assignmentDetailsBaseline, normalizedAssignmentSignerName]);

  const resetActionModal = () => {
    setActionItem(null);
    setActionMode("set_quantity");
    setShowActionHolders(false);
    setActionError(null);
    setStockForm({ quantity: "" });
    setIssueForm({ quantity: 1, issuedTo: "", employeeId: "", department: "", expectedReturnDate: "" });
  };

  const performAssignmentSync = async (targetOverrides?: Record<string, number>) => {
    if (!normalizedAssignmentSignerName) {
      setAssignmentError("יש להזין שם חותם לפני שמירת ההחתמה");
      return false;
    }

    setIsSyncingAssignments(true);
    setAssignmentError(null);

    const result = await api.syncEmployeeEquipmentAssignmentsDetailed({
      issuedTo: normalizedAssignmentSignerName,
      employeeId: matchedSignerEmployee?.id,
      department: assignmentDetails.department.trim() || matchedSignerEmployee?.department || "",
      expectedReturnDate: assignmentDetails.expectedReturnDate || undefined,
      applyMetadataToExisting: hasAssignmentMetadataChanges,
      assignments: equipmentTypes.map((equipment) => ({
        equipmentId: equipment.id,
        targetQuantity: targetOverrides?.[equipment.id] ?? assignmentDraft[equipment.id] ?? selectedEmployeeCurrentByEquipment.get(equipment.id) ?? 0,
      })),
    });

    if (!result.data) {
      setAssignmentError(formatEquipmentActionError(result.error));
      setIsSyncingAssignments(false);
      return false;
    }

    await onRefresh();
    setIsSyncingAssignments(false);
    return true;
  };

  const openActionModal = (item: EquipmentTypeWithQty) => {
    setActionItem(item);
    setActionMode("set_quantity");
    setShowActionHolders(false);
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

  const openSignerManagementFromItem = (signerName: string, equipmentName?: string) => {
    setActiveSection("assign_by_name");
    setAssignmentSignerName(signerName);
    setAssignmentViewMode("assigned_items");
    setEmployeeEquipmentSearch(equipmentName ?? "");
    resetActionModal();

    requestAnimationFrame(() => {
      signerManagementRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
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
    await performAssignmentSync();
  };

  const handleReturnAllAssigned = async () => {
    const zeroTargets = Object.fromEntries(
      equipmentTypes.map((equipment) => [equipment.id, 0])
    ) as Record<string, number>;
    await performAssignmentSync(zeroTargets);
  };

  const openAssignedQuantityModal = (equipmentId: string) => {
    const row = allAssignmentRows.find((equipment) => equipment.id === equipmentId);
    if (!row) return;
    setEditingAssignedEquipmentId(equipmentId);
    setAssignedQuantityInput(String(row.targetQuantity));
  };

  const closeAssignedQuantityModal = () => {
    setEditingAssignedEquipmentId(null);
    setAssignedQuantityInput("");
  };

  const saveAssignedQuantityChange = () => {
    if (!editingAssignedEquipment) return;
    updateAssignmentDraft(editingAssignedEquipment.id, Number(assignedQuantityInput));
    closeAssignedQuantityModal();
  };

  const markAssignedItemReturned = () => {
    if (!editingAssignedEquipment) return;
    updateAssignmentDraft(editingAssignedEquipment.id, 0);
    closeAssignedQuantityModal();
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

  const assignedColumns = [
    {
      key: "name",
      header: "פריט",
      render: (equipment: typeof assignedItemRows[number]) => (
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
      key: "currentQuantity",
      header: "כמות חתומה",
      render: (equipment: typeof assignedItemRows[number]) => equipment.currentQuantity,
    },
    {
      key: "targetQuantity",
      header: "כמות אחרי שינוי",
      render: (equipment: typeof assignedItemRows[number]) => equipment.targetQuantity,
    },
    {
      key: "expectedReturnDate",
      header: "תאריך יעד",
      render: () => formatDate(assignmentDetails.expectedReturnDate),
    },
    {
      key: "actions",
      header: "פעולה",
      render: (equipment: typeof assignedItemRows[number]) => (
        <button
          type="button"
          onClick={() => openAssignedQuantityModal(equipment.id)}
          className="text-xs font-medium text-primary hover:text-primary/80"
        >
          שנה כמות
        </button>
      ),
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
      <section className="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              מלאי לפי סוג
            </h3>
            {equipmentTypeSearch.trim() && (
              <p className="mt-1 text-sm text-muted-foreground">
                נמצאו {filteredTypesWithQty.length} פריטי ציוד עבור "{equipmentTypeSearch.trim()}"
              </p>
            )}
          </div>

          <SearchInput
            value={equipmentTypeSearch}
            onChange={setEquipmentTypeSearch}
            placeholder="חיפוש פריט לפי שם..."
            className="w-full lg:w-80"
          />
        </div>

        <div className="space-y-0">
          <DataTable
            columns={[
              {
                key: "name",
                header: "שם פריט",
                render: (equipment: EquipmentTypeWithQty) => (
                  <span className="font-semibold">{equipment.name}</span>
                ),
              },
              { key: "totalQuantity", header: "סה״כ" },
              {
                key: "available",
                header: "זמין",
                render: (equipment: EquipmentTypeWithQty) => (
                  <span className={equipment.available === 0 ? "font-bold text-status-danger-text" : "font-bold text-status-success-text"}>
                    {equipment.available}
                  </span>
                ),
              },
              { key: "issued", header: "מושאל" },
              {
                key: "actions",
                header: "פעולות",
                render: (equipment: EquipmentTypeWithQty) => (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      openActionModal(equipment);
                    }}
                    className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80"
                  >
                    <ArrowRightLeft size={14} />
                    פעולה
                  </button>
                ),
              },
            ]}
            data={paginatedTypesWithQty}
            rowKey={(equipment) => equipment.id}
            onRowClick={(equipment) => setSelectedType(equipment.id === selectedType?.id ? null : equipment)}
            emptyMessage={
              equipmentTypeSearch.trim()
                ? "לא נמצאו פריטי ציוד עבור החיפוש הזה"
                : "אין פריטי ציוד להצגה"
            }
            minWidthClassName="min-w-[38rem]"
            className="rounded-b-none border border-border shadow-none"
          />
          <TablePagination
            currentPage={equipmentTypePage}
            totalPages={equipmentTypeTotalPages}
            totalItems={filteredTypesWithQty.length}
            pageSize={equipmentTypePageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setEquipmentTypePage}
            onPageSizeChange={(pageSize) => {
              setEquipmentTypePageSize(pageSize as TablePageSize);
              setEquipmentTypePage(1);
            }}
            itemLabel="פריטים"
          />
        </div>
      </section>

      <section className="space-y-4" ref={signerManagementRef}>
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
                !normalizedAssignmentSignerName ||
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
              data={paginatedActiveLedgerRows}
              rowKey={(l) => l.id}
              emptyMessage={
                issuedToSearch.trim()
                  ? "לא נמצאו פריטים מושאלים עבור החיפוש הזה"
                  : "אין פריטים מושאלים"
              }
              minWidthClassName="min-w-[56rem]"
              className="rounded-b-none border border-border shadow-none"
            />
            <TablePagination
              currentPage={issuedItemsPage}
              totalPages={issuedItemsTotalPages}
              totalItems={activeLedgerRows.length}
              pageSize={issuedItemsPageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageChange={setIssuedItemsPage}
              onPageSizeChange={(pageSize) => {
                setIssuedItemsPageSize(pageSize as TablePageSize);
                setIssuedItemsPage(1);
              }}
              itemLabel="רשומות"
            />
          </>
        ) : (
          <div className="space-y-4 rounded-lg bg-card p-4 shadow-card sm:p-5">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,18rem)_minmax(0,18rem)] xl:items-end">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">שם חותם</label>
                <input
                  type="text"
                  value={assignmentSignerName}
                  onChange={(event) => setAssignmentSignerName(event.target.value)}
                  placeholder="הקלד שם חותם..."
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  dir="rtl"
                />
              </div>

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
              </div>
            </div>

            <div className="space-y-3 rounded-lg border border-border bg-background px-4 py-4">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    חתומים פעילים
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    לחץ על שם כדי לטעון את כל הציוד שמקושר אליו ולערוך את ההחתמה.
                  </p>
                </div>
                <span className="text-sm text-muted-foreground">
                  {activeSignerSummaries.length} חתומים
                </span>
              </div>

              {activeSignerSummaries.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {activeSignerSummaries.map((signer) => (
                    <button
                      key={signer.key}
                      type="button"
                      onClick={() => setAssignmentSignerName(signer.name)}
                      className={`rounded-md border px-3 py-2 text-right text-sm transition-colors ${
                        normalizedAssignmentSignerName === signer.name
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border text-foreground hover:bg-muted"
                      }`}
                    >
                      <span className="block font-medium">{signer.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {signer.department || "ללא מחלקה"} • {signer.assignedUnits} פריטים
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  אין כרגע חותמים פעילים על ציוד.
                </div>
              )}
            </div>

            {!normalizedAssignmentSignerName ? (
              <div className="rounded-lg border border-dashed border-border bg-background px-4 py-10 text-center text-sm text-muted-foreground">
                בחר שם מהרשימה או הזן שם חותם כדי להחתים או להסיר עבורו ציוד.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-muted/40 px-4 py-3">
                    <div className="text-xs text-muted-foreground">שם חותם</div>
                    <div className="mt-1 font-semibold text-foreground">{normalizedAssignmentSignerName}</div>
                    <div className="text-xs text-muted-foreground">
                      {matchedSignerEmployee ? matchedSignerEmployee.department : "שם חופשי"}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-4 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-xs text-muted-foreground">פריטים משוייכים</div>
                        <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">{selectedEmployeeActiveUnits}</div>
                      </div>
                      <button
                        type="button"
                        onClick={handleReturnAllAssigned}
                        disabled={selectedEmployeeActiveUnits === 0 || isSyncingAssignments}
                        className="rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        זכה הכל
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-border bg-background px-4 py-4">
                  <div className="flex flex-col gap-1">
                    <DateDisplayInput
                      label="תאריך החזרה צפוי"
                      value={assignmentDetails.expectedReturnDate}
                      onChange={(expectedReturnDate) =>
                        setAssignmentDetails((current) => ({
                          ...current,
                          expectedReturnDate,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setAssignmentViewMode("assigned_items")}
                    className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                      assignmentViewMode === "assigned_items"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    פריטים משוייכים
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignmentViewMode("add_items")}
                    className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                      assignmentViewMode === "add_items"
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    הוסף פריטים
                  </button>
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

                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">חיפוש פריט</label>
                    <SearchInput
                      value={employeeEquipmentSearch}
                      onChange={setEmployeeEquipmentSearch}
                      placeholder="חיפוש פריט לפי שם..."
                      className="w-full"
                    />
                  </div>

                  {assignmentViewMode === "assigned_items" ? (
                    <DataTable
                      columns={assignedColumns}
                      data={paginatedAssignedItemRows}
                      rowKey={(equipment) => equipment.id}
                      emptyMessage={
                        employeeEquipmentSearch.trim()
                          ? "לא נמצאו פריטים משוייכים עבור החיפוש הזה"
                          : "אין כרגע פריטים משוייכים לחותם הזה"
                      }
                      minWidthClassName="min-w-[56rem]"
                      className="rounded-b-none border border-border shadow-none"
                    />
                  ) : (
                    <DataTable
                      columns={assignmentColumns}
                      data={paginatedAssignmentRows}
                      rowKey={(equipment) => equipment.id}
                      emptyMessage={
                        employeeEquipmentSearch.trim()
                          ? "לא נמצאו פריטי ציוד עבור החיפוש הזה"
                          : "אין פריטי ציוד להצגה"
                      }
                      minWidthClassName="min-w-[64rem]"
                      className="rounded-b-none border border-border shadow-none"
                    />
                  )}
                  <TablePagination
                    currentPage={assignmentTablePage}
                    totalPages={assignmentTableTotalPages}
                    totalItems={activeAssignmentRows.length}
                    pageSize={assignmentTablePageSize}
                    pageSizeOptions={PAGE_SIZE_OPTIONS}
                    onPageChange={setAssignmentTablePage}
                    onPageSizeChange={(pageSize) => {
                      setAssignmentTablePageSize(pageSize as TablePageSize);
                      setAssignmentTablePage(1);
                    }}
                    itemLabel={assignmentViewMode === "assigned_items" ? "פריטים משוייכים" : "פריטי ציוד"}
                  />
                </div>

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
        {showActionHolders ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              בחר חותם כדי לפתוח מיד את מסך "החתמה לפי שם" עבור {actionItem?.name} ולנהל את הכמות או להוסיף לו ציוד נוסף.
            </div>

            {actionItemHolders.length > 0 ? (
              <div className="space-y-2">
                {actionItemHolders.map((holder) => (
                  <button
                    key={holder.key}
                    type="button"
                    onClick={() => openSignerManagementFromItem(holder.name, actionItem?.name)}
                    className="flex w-full items-center justify-between rounded-lg border border-border px-4 py-3 text-right transition-colors hover:bg-muted"
                  >
                    <div className="flex flex-col gap-1">
                      <span className="font-medium text-foreground">{holder.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {holder.department || "ללא מחלקה"}
                      </span>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-foreground">
                      {holder.assignedUnits}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-background px-4 py-8 text-center text-sm text-muted-foreground">
                אין כרגע חותמים פעילים עבור הפריט הזה.
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => setShowActionHolders(false)}
                className="w-full rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:w-auto"
              >
                חזרה לפעולות
              </button>
              <button
                type="button"
                onClick={resetActionModal}
                className="w-full rounded-md px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted sm:w-auto"
              >
                סגירה
              </button>
            </div>
          </div>
        ) : (
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
                  {actionItem && actionItem.issued > 0 ? (
                    <button
                      type="button"
                      onClick={() => setShowActionHolders(true)}
                      className="rounded-lg bg-muted/40 px-4 py-3 text-right transition-colors hover:bg-muted"
                    >
                      <div className="text-xs text-muted-foreground">מונפק כעת</div>
                      <div className="text-lg font-semibold tabular-nums text-primary">{actionItem.issued}</div>
                      <div className="mt-1 text-xs text-muted-foreground">לחץ לצפייה בחתומים הפעילים</div>
                    </button>
                  ) : (
                    <div className="rounded-lg bg-muted/40 px-4 py-3">
                      <div className="text-xs text-muted-foreground">מונפק כעת</div>
                      <div className="text-lg font-semibold tabular-nums">{actionItem?.issued ?? 0}</div>
                    </div>
                  )}
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
        )}
      </Modal>

      <Modal
        open={!!editingAssignedEquipment}
        onClose={closeAssignedQuantityModal}
        title={`שנה כמות — ${editingAssignedEquipment?.name || ""}`}
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-muted/40 px-4 py-3">
              <div className="text-xs text-muted-foreground">כמות חתומה</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                {editingAssignedEquipment?.currentQuantity ?? 0}
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 px-4 py-3">
              <div className="text-xs text-muted-foreground">זמין להוספה</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                {editingAssignedEquipment?.available ?? 0}
              </div>
            </div>
            <div className="rounded-lg bg-muted/40 px-4 py-3">
              <div className="text-xs text-muted-foreground">מקסימום אפשרי</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                {editingAssignedEquipment?.maxTargetQuantity ?? 0}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">כמות חדשה</label>
            <input
              type="number"
              min={0}
              max={editingAssignedEquipment?.maxTargetQuantity ?? 0}
              value={assignedQuantityInput}
              onChange={(event) => setAssignedQuantityInput(event.target.value)}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={markAssignedItemReturned}
              className="w-full rounded-md border border-status-danger-text/30 px-4 py-2.5 text-sm font-medium text-status-danger-text transition-colors hover:bg-status-danger-bg sm:w-auto"
            >
              הוחזר
            </button>

            <div className="flex flex-col-reverse gap-3 sm:flex-row">
              <button
                type="button"
                onClick={saveAssignedQuantityChange}
                className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto"
              >
                שמור כמות
              </button>
              <button
                type="button"
                onClick={closeAssignedQuantityModal}
                className="w-full rounded-md px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted sm:w-auto"
              >
                ביטול
              </button>
            </div>
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
