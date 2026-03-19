import React, { useMemo, useState } from "react";
import {
  Department,
  DrivingLicense,
  Employee,
  FoodProduct,
  InitialData,
  Qualification,
  Vehicle,
} from "@/types";
import { PageHeader } from "@/components/shared/PageHeader";
import { SummaryCard } from "@/components/shared/SummaryCard";
import { Modal } from "@/components/shared/Modal";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { Badge } from "@/components/shared/Badge";
import { api } from "@/api";
import {
  calcWarehouseStock,
  downloadCsv,
  employeeStatusLabel,
  employeeStatusVariant,
  formatDate,
  vehicleStatusLabel,
  vehicleStatusVariant,
} from "@/utils";
import {
  Award,
  Database,
  Download,
  FileSpreadsheet,
  KeyRound,
  Plus,
  ShieldAlert,
  ShoppingBasket,
  Truck,
  Users,
} from "lucide-react";

interface Props {
  data: InitialData;
  onRefresh: () => Promise<void> | void;
}

type ManagementSection =
  | "employees"
  | "departments"
  | "products"
  | "vehicles"
  | "qualifications"
  | "licenses"
  | "exports";

type DeleteTarget = {
  id: string;
  label: string;
  type: Exclude<ManagementSection, "exports">;
};

type EmployeeFormState = {
  name: string;
  departmentId: string;
  role: string;
  phone: string;
  qualificationIds: string[];
  drivingLicenseIds: string[];
};

type ExportTarget =
  | "all"
  | "employees"
  | "departments"
  | "vehicles"
  | "vehicleTasks"
  | "missions"
  | "equipmentLedger"
  | "foodProducts"
  | "foodTransactions"
  | "apartments"
  | "qualifications"
  | "drivingLicenses";

const SECTION_META: Record<
  ManagementSection,
  { label: string; addLabel?: string; icon: React.ReactNode }
> = {
  employees: { label: "עובדים", addLabel: "הוספת עובד", icon: <Users size={16} /> },
  departments: { label: "מחלקות", addLabel: "הוספת מחלקה", icon: <Database size={16} /> },
  products: { label: "מוצרים לפי מחלקה", addLabel: "הוספת מוצר", icon: <ShoppingBasket size={16} /> },
  vehicles: { label: "רכבים", addLabel: "הוספת רכב", icon: <Truck size={16} /> },
  qualifications: { label: "הכשרות", addLabel: "הוספת הכשרה", icon: <Award size={16} /> },
  licenses: { label: "רישיונות נהיגה", addLabel: "הוספת רישיון", icon: <KeyRound size={16} /> },
  exports: { label: "ייצוא חכם", icon: <FileSpreadsheet size={16} /> },
};

const SECTION_ORDER: ManagementSection[] = [
  "employees",
  "departments",
  "products",
  "vehicles",
  "qualifications",
  "licenses",
  "exports",
];

function formatManagementError(error?: string): string {
  if (!error) return "הפעולה נכשלה";

  const errorMap: Record<string, string> = {
    "Department already exists": "מחלקה בשם הזה כבר קיימת",
    "Qualification already exists": "הכשרה בשם הזה כבר קיימת",
    "Driving license already exists": "רישיון בשם הזה כבר קיים",
    "Vehicle already exists": "רכב עם אותה לוחית כבר קיים",
    "Employee already exists": "עובד בשם הזה כבר קיים",
    "Food product already exists": "מוצר בשם הזה כבר קיים",
    "Cannot delete department assigned to employees": "לא ניתן למחוק מחלקה שמשויכת לעובדים",
    "Cannot delete department used by active equipment issues": "לא ניתן למחוק מחלקה שמשויכת להוצאות ציוד פעילות",
    "Cannot delete department assigned to products": "לא ניתן למחוק מחלקה שמשויכת למוצרים",
    "Cannot delete product with inventory history": "לא ניתן למחוק מוצר עם היסטוריית מלאי",
    "Cannot delete a vehicle that is currently in use": "לא ניתן למחוק רכב שנמצא כרגע בשימוש",
    "Cannot delete a vehicle with an open trip": "לא ניתן למחוק רכב עם משימה פתוחה",
    "Cannot delete employee with active equipment loans": "לא ניתן למחוק עובד עם ציוד מושאל פעיל",
    "Cannot delete employee assigned to an active vehicle": "לא ניתן למחוק עובד שמשויך לרכב פעיל",
    "Cannot delete driving license used by vehicles": "לא ניתן למחוק רישיון שמשויך לרכבים קיימים",
    "Cannot delete driving license used by vehicle history": "לא ניתן למחוק רישיון שמשויך להיסטוריית משימות",
    "Department not found": "המחלקה שנבחרה לא נמצאה",
    "Driving license not found": "הרישיון שנבחר לא נמצא",
    "Qualification not found": "ההכשרה שנבחרה לא נמצאה",
    "Employee not found": "העובד לא נמצא",
    "Vehicle not found": "הרכב לא נמצא",
    "Missing department name": "יש להזין שם מחלקה",
    "Missing qualification name": "יש להזין שם הכשרה",
    "Missing driving license name": "יש להזין שם רישיון",
    "Missing employee name": "יש להזין שם עובד",
    "Missing vehicle plate": "יש להזין לוחית רישוי",
    "Missing product name or category": "יש להזין שם מוצר וקטגוריה",
  };

  return errorMap[error] ?? error;
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
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין פריטים זמינים</p>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {items.map((item) => (
              <label
                key={item.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border border-transparent px-2 py-1.5 text-sm hover:bg-muted"
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
        )}
      </div>
    </div>
  );
}

export const SettingsPage: React.FC<Props> = ({ data, onRefresh }) => {
  const {
    departments,
    employees,
    qualifications,
    drivingLicenses,
    employeeQualifications,
    employeeDrivingLicenses,
    vehicles,
    vehicleTasks: vehicleTaskRows,
    campTasks,
    apartments,
    foodProducts,
    foodTransactions,
    equipmentLedger,
  } = data;

  const [activeSection, setActiveSection] = useState<ManagementSection>("employees");
  const [search, setSearch] = useState("");
  const [createModal, setCreateModal] = useState<Exclude<ManagementSection, "exports"> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [departmentForm, setDepartmentForm] = useState({ name: "" });
  const [qualificationForm, setQualificationForm] = useState({ name: "" });
  const [licenseForm, setLicenseForm] = useState({ name: "" });
  const [vehicleForm, setVehicleForm] = useState({ plate: "", vehicleType: "", notes: "" });
  const [employeeForm, setEmployeeForm] = useState<EmployeeFormState>({
    name: "",
    departmentId: departments[0]?.id ?? "",
    role: "",
    phone: "",
    qualificationIds: [],
    drivingLicenseIds: [],
  });
  const [productForm, setProductForm] = useState({
    name: "",
    category: "",
    departmentId: departments[0]?.id ?? "",
    initialQuantity: "0",
  });
  const [exportTarget, setExportTarget] = useState<ExportTarget>("employees");
  const [exportDepartment, setExportDepartment] = useState("all");
  const [exportQualification, setExportQualification] = useState("all");
  const [exportDrivingLicense, setExportDrivingLicense] = useState("all");
  const [exportStatus, setExportStatus] = useState("all");

  const qualificationNameById = useMemo(
    () => new Map(qualifications.map((qualification) => [qualification.id, qualification.name])),
    [qualifications]
  );
  const drivingLicenseNameById = useMemo(
    () => new Map(drivingLicenses.map((license) => [license.id, license.name])),
    [drivingLicenses]
  );
  const employeeQualificationsMap = useMemo(() => {
    const map = new Map<string, string[]>();
    employeeQualifications.forEach((assignment) => {
      const current = map.get(assignment.employeeId) ?? [];
      current.push(qualificationNameById.get(assignment.qualificationId) ?? assignment.qualificationId);
      map.set(assignment.employeeId, current.sort((a, b) => a.localeCompare(b, "he")));
    });
    return map;
  }, [employeeQualifications, qualificationNameById]);
  const employeeDrivingLicensesMap = useMemo(() => {
    const map = new Map<string, string[]>();
    employeeDrivingLicenses.forEach((assignment) => {
      const current = map.get(assignment.employeeId) ?? [];
      current.push(
        drivingLicenseNameById.get(assignment.drivingLicenseId) ?? assignment.drivingLicenseId
      );
      map.set(assignment.employeeId, current.sort((a, b) => a.localeCompare(b, "he")));
    });
    return map;
  }, [drivingLicenseNameById, employeeDrivingLicenses]);

  const productRows = useMemo(
    () =>
      foodProducts.map((product) => ({
        ...product,
        stock: calcWarehouseStock(foodTransactions, product.id),
      })),
    [foodProducts, foodTransactions]
  );

  const departmentRows = useMemo(
    () =>
      departments.map((department) => ({
        ...department,
        employeeCount: employees.filter((employee) => employee.department === department.name).length,
        productCount: foodProducts.filter((product) => product.department === department.name).length,
      })),
    [departments, employees, foodProducts]
  );

  const employeeRows = useMemo(
    () =>
      employees.map((employee) => ({
        ...employee,
        qualifications: employeeQualificationsMap.get(employee.id) ?? [],
        drivingLicenses: employeeDrivingLicensesMap.get(employee.id) ?? [],
      })),
    [employeeDrivingLicensesMap, employeeQualificationsMap, employees]
  );

  const filteredDepartments = departmentRows.filter((department) => department.name.includes(search));
  const filteredQualifications = qualifications.filter((qualification) => qualification.name.includes(search));
  const filteredLicenses = drivingLicenses.filter((license) => license.name.includes(search));
  const filteredVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.plate.includes(search) ||
      vehicle.vehicleType?.includes(search) ||
      vehicle.currentDriver?.includes(search) ||
      vehicle.taskPurpose?.includes(search) ||
      vehicle.notes?.includes(search)
  );
  const filteredEmployees = employeeRows.filter(
    (employee) =>
      employee.name.includes(search) ||
      employee.department.includes(search) ||
      employee.role?.includes(search) ||
      employee.phone?.includes(search) ||
      employee.qualifications.some((qualification) => qualification.includes(search)) ||
      employee.drivingLicenses.some((license) => license.includes(search))
  );
  const filteredProducts = productRows.filter(
    (product) =>
      product.name.includes(search) ||
      product.category.includes(search) ||
      product.department?.includes(search)
  );

  const exportEmployeeRows = useMemo(() => {
    return employeeRows.filter((employee) => {
      if (exportDepartment !== "all" && employee.department !== exportDepartment) return false;
      if (exportStatus !== "all" && employee.status !== exportStatus) return false;
      if (
        exportQualification !== "all" &&
        !(employeeQualificationsMap.get(employee.id) ?? []).includes(
          qualificationNameById.get(exportQualification) ?? ""
        )
      ) {
        return false;
      }
      if (
        exportDrivingLicense !== "all" &&
        !(employeeDrivingLicensesMap.get(employee.id) ?? []).includes(
          drivingLicenseNameById.get(exportDrivingLicense) ?? ""
        )
      ) {
        return false;
      }
      return true;
    });
  }, [
    drivingLicenseNameById,
    employeeDrivingLicensesMap,
    employeeQualificationsMap,
    employeeRows,
    exportDepartment,
    exportDrivingLicense,
    exportQualification,
    exportStatus,
    qualificationNameById,
  ]);

  const exportRowsByTarget = useMemo<Record<Exclude<ExportTarget, "all">, string[][]>>(
    () => ({
      employees: [
        ["שם", "מחלקה", "תפקיד", "טלפון", "סטטוס", "תחילת מילואים", "סיום מילואים", "הכשרות", "רישיונות נהיגה"],
        ...exportEmployeeRows.map((employee) => [
          employee.name,
          employee.department,
          employee.role || "",
          employee.phone || "",
          employeeStatusLabel(employee.status),
          formatDate(employee.reserveStartDate),
          formatDate(employee.reserveEndDate),
          employee.qualifications.join(", "),
          employee.drivingLicenses.join(", "),
        ]),
      ],
      departments: [
        ["מחלקה", "כמות עובדים", "כמות מוצרים"],
        ...departmentRows.map((department) => [
          department.name,
          String(department.employeeCount),
          String(department.productCount),
        ]),
      ],
      vehicles: [
        ["לוחית רישוי", "סוג רכב", "סטטוס", "נהג נוכחי", "משימה פעילה", "הערות"],
        ...vehicles.map((vehicle) => [
          vehicle.plate,
          vehicle.vehicleType || "",
          vehicleStatusLabel(vehicle.status),
          vehicle.currentDriver || "",
          vehicle.taskPurpose || "",
          vehicle.notes || "",
        ]),
      ],
      vehicleTasks: [
        ["תאריך יציאה", "תאריך סיום", "נהג", "רכב", "סוג רכב", "מיקום", "מטרת משימה", "סוג משימה", "סיכום טיפול"],
        ...vehicleTaskRows.map((task) => [
          formatDate(task.departureTime),
          formatDate(task.returnTime),
          task.driver,
          task.plate,
          task.vehicleType || "",
          task.departureLocation,
          task.taskPurpose,
          task.missionType,
          task.treatmentSummary || "",
        ]),
      ],
      missions: [
        ["תאריך", "מחלקה", "מבקש", "משימה", "סיכום טיפול"],
        ...campTasks.map((task) => [
          formatDate(task.date),
          task.department || "",
          task.requesterName,
          task.mission,
          task.treatmentSummary || "",
        ]),
      ],
      equipmentLedger: [
        ["פריט", "כמות", "נמסר ל", "מחלקה", "תאריך הוצאה", "תאריך החזרה צפוי", "תאריך החזרה", "סטטוס"],
        ...equipmentLedger.map((entry) => [
          entry.equipmentName,
          String(entry.quantity),
          entry.issuedTo,
          entry.department,
          formatDate(entry.issueDate),
          formatDate(entry.expectedReturnDate),
          formatDate(entry.returnDate),
          entry.status,
        ]),
      ],
      foodProducts: [
        ["מוצר", "קטגוריה", "מחלקה", "מלאי נוכחי"],
        ...productRows.map((product) => [
          product.name,
          product.category,
          product.department || "",
          String(product.stock),
        ]),
      ],
      foodTransactions: [
        ["תאריך", "סוג", "מוצר", "כמות", "יעד"],
        ...foodTransactions.map((transaction) => [
          formatDate(transaction.date),
          transaction.type === "in" ? "כניסה" : "יציאה",
          transaction.productName,
          String(transaction.quantity),
          transaction.destination || "",
        ]),
      ],
      apartments: [
        ["דירה", "אספקה אחרונה"],
        ...apartments.map((apartment) => [apartment.name, formatDate(apartment.lastSupplied)]),
      ],
      qualifications: [
        ["הכשרה", "מספר עובדים משויכים"],
        ...qualifications.map((qualification) => [
          qualification.name,
          String(
            employeeQualifications.filter(
              (assignment) => assignment.qualificationId === qualification.id
            ).length
          ),
        ]),
      ],
      drivingLicenses: [
        ["רישיון נהיגה", "עובדים משויכים", "רכבים משויכים"],
        ...drivingLicenses.map((license) => [
          license.name,
          String(
            employeeDrivingLicenses.filter(
              (assignment) => assignment.drivingLicenseId === license.id
            ).length
          ),
          String(vehicles.filter((vehicle) => vehicle.vehicleType === license.name).length),
        ]),
      ],
    }),
    [
      campTasks,
      apartments,
      departmentRows,
      drivingLicenses,
      employeeDrivingLicenses,
      employeeQualifications,
      equipmentLedger,
      exportEmployeeRows,
      foodTransactions,
      productRows,
      qualifications,
      vehicleTaskRows,
      vehicles,
    ]
  );

  const openCreateModal = (section: Exclude<ManagementSection, "exports">) => {
    setCreateModal(section);
    setActionError(null);
    if (section === "employees") {
      setEmployeeForm({
        name: "",
        departmentId: departments[0]?.id ?? "",
        role: "",
        phone: "",
        qualificationIds: [],
        drivingLicenseIds: [],
      });
    }
    if (section === "products") {
      setProductForm({
        name: "",
        category: "",
        departmentId: departments[0]?.id ?? "",
        initialQuantity: "0",
      });
    }
    if (section === "vehicles") {
      setVehicleForm({ plate: "", vehicleType: drivingLicenses[0]?.name ?? "", notes: "" });
    }
  };

  const closeCreateModal = () => {
    setCreateModal(null);
    setActionError(null);
  };

  const submitCreate = async () => {
    if (!createModal) return;

    setIsSaving(true);
    setActionError(null);

    try {
      if (createModal === "departments") {
        const result = await api.createDepartmentDetailed(departmentForm.name.trim());
        if (!result.data) throw new Error(result.error);
        setDepartmentForm({ name: "" });
      }

      if (createModal === "qualifications") {
        const result = await api.createQualificationDetailed(qualificationForm.name.trim());
        if (!result.data) throw new Error(result.error);
        setQualificationForm({ name: "" });
      }

      if (createModal === "licenses") {
        const result = await api.createDrivingLicenseDetailed(licenseForm.name.trim());
        if (!result.data) throw new Error(result.error);
        setLicenseForm({ name: "" });
      }

      if (createModal === "vehicles") {
        const result = await api.createVehicleDetailed({
          plate: vehicleForm.plate.trim(),
          vehicleType: vehicleForm.vehicleType.trim() || undefined,
          notes: vehicleForm.notes.trim() || undefined,
        });
        if (!result.data) throw new Error(result.error);
      }

      if (createModal === "employees") {
        const result = await api.createEmployeeDetailed({
          name: employeeForm.name.trim(),
          departmentId: employeeForm.departmentId,
          role: employeeForm.role.trim() || undefined,
          phone: employeeForm.phone.trim() || undefined,
          qualificationIds: employeeForm.qualificationIds,
          drivingLicenseIds: employeeForm.drivingLicenseIds,
        });
        if (!result.data) throw new Error(result.error);
      }

      if (createModal === "products") {
        const result = await api.createFoodProductDetailed({
          name: productForm.name.trim(),
          category: productForm.category.trim(),
          departmentId: productForm.departmentId,
          initialQuantity: Number(productForm.initialQuantity || 0),
        });
        if (!result.data) throw new Error(result.error);
      }

      closeCreateModal();
      await onRefresh();
    } catch (error) {
      setActionError(formatManagementError(error instanceof Error ? error.message : undefined));
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setIsSaving(true);
    setActionError(null);

    try {
      let result;
      if (deleteTarget.type === "departments") result = await api.deleteDepartmentDetailed(deleteTarget.id);
      if (deleteTarget.type === "qualifications") result = await api.deleteQualificationDetailed(deleteTarget.id);
      if (deleteTarget.type === "licenses") result = await api.deleteDrivingLicenseDetailed(deleteTarget.id);
      if (deleteTarget.type === "products") result = await api.deleteFoodProductDetailed(deleteTarget.id);
      if (deleteTarget.type === "vehicles") result = await api.deleteVehicleDetailed(deleteTarget.id);
      if (deleteTarget.type === "employees") result = await api.deleteEmployeeDetailed(deleteTarget.id);

      if (!result?.data) throw new Error(result?.error);

      setDeleteTarget(null);
      await onRefresh();
    } catch (error) {
      setActionError(formatManagementError(error instanceof Error ? error.message : undefined));
    } finally {
      setIsSaving(false);
    }
  };

  const exportSingleTarget = (target: Exclude<ExportTarget, "all">) => {
    downloadCsv(`${target}.csv`, exportRowsByTarget[target]);
  };

  const exportAllTargets = () => {
    (
      Object.keys(exportRowsByTarget) as Array<Exclude<ExportTarget, "all">>
    ).forEach((target) => {
      downloadCsv(`${target}.csv`, exportRowsByTarget[target]);
    });
  };

  const departmentColumns = [
    { key: "name", header: "מחלקה" },
    { key: "employeeCount", header: "עובדים" },
    { key: "productCount", header: "מוצרים" },
    {
      key: "actions",
      header: "פעולות",
      render: (department: Department & { employeeCount: number; productCount: number }) => (
        <button
          onClick={() =>
            setDeleteTarget({ id: department.id, label: department.name, type: "departments" })
          }
          className="text-xs font-medium text-status-danger-text hover:underline"
        >
          מחק
        </button>
      ),
    },
  ];

  const qualificationColumns = [
    { key: "name", header: "שם הכשרה" },
    {
      key: "assignedCount",
      header: "שיוכים",
      render: (qualification: Qualification) =>
        employeeQualifications.filter((assignment) => assignment.qualificationId === qualification.id)
          .length,
    },
    {
      key: "actions",
      header: "פעולות",
      render: (qualification: Qualification) => (
        <button
          onClick={() =>
            setDeleteTarget({ id: qualification.id, label: qualification.name, type: "qualifications" })
          }
          className="text-xs font-medium text-status-danger-text hover:underline"
        >
          מחק
        </button>
      ),
    },
  ];

  const productColumns = [
    { key: "name", header: "מוצר" },
    { key: "category", header: "קטגוריה" },
    {
      key: "department",
      header: "מחלקה",
      render: (product: FoodProduct & { stock: number }) => product.department || "ללא שיוך",
    },
    { key: "stock", header: "מלאי נוכחי" },
    {
      key: "actions",
      header: "פעולות",
      render: (product: FoodProduct & { stock: number }) => (
        <button
          onClick={() => setDeleteTarget({ id: product.id, label: product.name, type: "products" })}
          className="text-xs font-medium text-status-danger-text hover:underline"
        >
          מחק
        </button>
      ),
    },
  ];

  const licenseColumns = [
    { key: "name", header: "רישיון נהיגה" },
    {
      key: "employeeCount",
      header: "עובדים משויכים",
      render: (license: DrivingLicense) =>
        employeeDrivingLicenses.filter((assignment) => assignment.drivingLicenseId === license.id).length,
    },
    {
      key: "vehicleCount",
      header: "רכבים משויכים",
      render: (license: DrivingLicense) =>
        vehicles.filter((vehicle) => vehicle.vehicleType === license.name).length,
    },
    {
      key: "actions",
      header: "פעולות",
      render: (license: DrivingLicense) => (
        <button
          onClick={() => setDeleteTarget({ id: license.id, label: license.name, type: "licenses" })}
          className="text-xs font-medium text-status-danger-text hover:underline"
        >
          מחק
        </button>
      ),
    },
  ];

  const vehicleColumns = [
    { key: "plate", header: "לוחית רישוי" },
    { key: "vehicleType", header: "סוג רכב", render: (vehicle: Vehicle) => vehicle.vehicleType || "—" },
    {
      key: "status",
      header: "סטטוס",
      render: (vehicle: Vehicle) => (
        <Badge variant={vehicleStatusVariant(vehicle.status)}>{vehicleStatusLabel(vehicle.status)}</Badge>
      ),
    },
    { key: "currentDriver", header: "נהג נוכחי", render: (vehicle: Vehicle) => vehicle.currentDriver || "—" },
    { key: "notes", header: "הערות", render: (vehicle: Vehicle) => vehicle.notes || "—" },
    {
      key: "actions",
      header: "פעולות",
      render: (vehicle: Vehicle) => (
        <button
          onClick={() => setDeleteTarget({ id: vehicle.plate, label: vehicle.plate, type: "vehicles" })}
          className="text-xs font-medium text-status-danger-text hover:underline"
        >
          מחק
        </button>
      ),
    },
  ];

  const employeeColumns = [
    { key: "name", header: "עובד" },
    { key: "department", header: "מחלקה" },
    { key: "role", header: "תפקיד", render: (employee: typeof employeeRows[number]) => employee.role || "—" },
    { key: "phone", header: "טלפון", render: (employee: typeof employeeRows[number]) => employee.phone || "—" },
    {
      key: "status",
      header: "סטטוס",
      render: (employee: typeof employeeRows[number]) => (
        <Badge variant={employeeStatusVariant(employee.status)}>{employeeStatusLabel(employee.status)}</Badge>
      ),
    },
    {
      key: "qualifications",
      header: "הכשרות",
      render: (employee: typeof employeeRows[number]) =>
        employee.qualifications.length > 0 ? employee.qualifications.join(", ") : "—",
    },
    {
      key: "drivingLicenses",
      header: "רישיונות נהיגה",
      render: (employee: typeof employeeRows[number]) =>
        employee.drivingLicenses.length > 0 ? employee.drivingLicenses.join(", ") : "—",
    },
    {
      key: "actions",
      header: "פעולות",
      render: (employee: typeof employeeRows[number]) => (
        <button
          onClick={() => setDeleteTarget({ id: employee.id, label: employee.name, type: "employees" })}
          className="text-xs font-medium text-status-danger-text hover:underline"
        >
          מחק
        </button>
      ),
    },
  ];

  const sectionContent = {
    departments: {
      data: filteredDepartments,
      columns: departmentColumns,
      emptyMessage: "אין מחלקות להצגה",
      rowKey: (department: Department) => department.id,
    },
    qualifications: {
      data: filteredQualifications,
      columns: qualificationColumns,
      emptyMessage: "אין הכשרות להצגה",
      rowKey: (qualification: Qualification) => qualification.id,
    },
    licenses: {
      data: filteredLicenses,
      columns: licenseColumns,
      emptyMessage: "אין רישיונות להצגה",
      rowKey: (license: DrivingLicense) => license.id,
    },
    products: {
      data: filteredProducts,
      columns: productColumns,
      emptyMessage: "אין מוצרים להצגה",
      rowKey: (product: FoodProduct) => product.id,
    },
    vehicles: {
      data: filteredVehicles,
      columns: vehicleColumns,
      emptyMessage: "אין רכבים להצגה",
      rowKey: (vehicle: Vehicle) => vehicle.plate,
    },
    employees: {
      data: filteredEmployees,
      columns: employeeColumns,
      emptyMessage: "אין עובדים להצגה",
      rowKey: (employee: typeof employeeRows[number]) => employee.id,
    },
  } as const;

  const renderCreateForm = () => {
    if (createModal === "departments") {
      return (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">שם מחלקה</label>
          <input
            type="text"
            value={departmentForm.name}
            onChange={(event) => setDepartmentForm({ name: event.target.value })}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            dir="rtl"
          />
        </div>
      );
    }

    if (createModal === "qualifications") {
      return (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">שם הכשרה</label>
          <input
            type="text"
            value={qualificationForm.name}
            onChange={(event) => setQualificationForm({ name: event.target.value })}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            dir="rtl"
          />
        </div>
      );
    }

    if (createModal === "licenses") {
      return (
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium">שם רישיון</label>
          <input
            type="text"
            value={licenseForm.name}
            onChange={(event) => setLicenseForm({ name: event.target.value })}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            dir="rtl"
          />
        </div>
      );
    }

    if (createModal === "vehicles") {
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">לוחית רישוי</label>
            <input
              type="text"
              value={vehicleForm.plate}
              onChange={(event) => setVehicleForm((current) => ({ ...current, plate: event.target.value }))}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              dir="rtl"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">סוג רכב</label>
            <select
              value={vehicleForm.vehicleType}
              onChange={(event) => setVehicleForm((current) => ({ ...current, vehicleType: event.target.value }))}
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
            <label className="text-sm font-medium">הערות</label>
            <input
              type="text"
              value={vehicleForm.notes}
              onChange={(event) => setVehicleForm((current) => ({ ...current, notes: event.target.value }))}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              dir="rtl"
            />
          </div>
        </div>
      );
    }

    if (createModal === "employees") {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">שם עובד</label>
              <input
                type="text"
                value={employeeForm.name}
                onChange={(event) => setEmployeeForm((current) => ({ ...current, name: event.target.value }))}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">מחלקה</label>
              <select
                value={employeeForm.departmentId}
                onChange={(event) =>
                  setEmployeeForm((current) => ({ ...current, departmentId: event.target.value }))
                }
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              >
                <option value="">בחר מחלקה</option>
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
                value={employeeForm.role}
                onChange={(event) => setEmployeeForm((current) => ({ ...current, role: event.target.value }))}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">טלפון</label>
              <input
                type="text"
                value={employeeForm.phone}
                onChange={(event) => setEmployeeForm((current) => ({ ...current, phone: event.target.value }))}
                className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              />
            </div>
          </div>
          <SelectionList
            title="הכשרות"
            items={qualifications}
            selectedIds={employeeForm.qualificationIds}
            onToggle={(id) =>
              setEmployeeForm((current) => ({
                ...current,
                qualificationIds: toggleSelection(current.qualificationIds, id),
              }))
            }
          />
          <SelectionList
            title="רישיונות נהיגה"
            items={drivingLicenses}
            selectedIds={employeeForm.drivingLicenseIds}
            onToggle={(id) =>
              setEmployeeForm((current) => ({
                ...current,
                drivingLicenseIds: toggleSelection(current.drivingLicenseIds, id),
              }))
            }
          />
        </div>
      );
    }

    if (createModal === "products") {
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">שם מוצר</label>
            <input
              type="text"
              value={productForm.name}
              onChange={(event) => setProductForm((current) => ({ ...current, name: event.target.value }))}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              dir="rtl"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">קטגוריה</label>
            <input
              type="text"
              value={productForm.category}
              onChange={(event) => setProductForm((current) => ({ ...current, category: event.target.value }))}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              dir="rtl"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">מחלקה</label>
            <select
              value={productForm.departmentId}
              onChange={(event) =>
                setProductForm((current) => ({ ...current, departmentId: event.target.value }))
              }
              className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              dir="rtl"
            >
              <option value="">בחר מחלקה</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">מלאי התחלתי</label>
            <input
              type="number"
              min={0}
              value={productForm.initialQuantity}
              onChange={(event) =>
                setProductForm((current) => ({ ...current, initialQuantity: event.target.value }))
              }
              className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="ניהול נתונים"
        subtitle="ניהול ישויות ליבה, שיוכי עובדים וייצוא חכם מרוכז"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-7">
        <SummaryCard label="עובדים" value={employees.length} icon={<Users size={18} />} />
        <SummaryCard label="מחלקות" value={departments.length} icon={<Database size={18} />} />
        <SummaryCard label="מוצרים" value={foodProducts.length} icon={<ShoppingBasket size={18} />} />
        <SummaryCard label="רכבים" value={vehicles.length} icon={<Truck size={18} />} />
        <SummaryCard label="הכשרות" value={qualifications.length} icon={<Award size={18} />} />
        <SummaryCard label="רישיונות" value={drivingLicenses.length} icon={<KeyRound size={18} />} />
        <SummaryCard label="טבלאות לייצוא" value={Object.keys(exportRowsByTarget).length} icon={<FileSpreadsheet size={18} />} />
      </div>

      <section className="flex items-start gap-3 rounded-lg bg-card p-4 shadow-card sm:p-5">
        <ShieldAlert size={18} className="mt-0.5 text-status-warning-text" />
        <div className="text-sm leading-6 text-muted-foreground">
          מחיקה מתבצעת רק כאשר אין תלותים שמסכנים את שלמות הנתונים. עובדים עם ציוד פעיל או רכב בשימוש
          ייחסמו, מחלקות עם עובדים או מוצרים ייחסמו, ורישיונות נהיגה ששימשו רכבים או היסטוריית משימות
          ייחסמו.
        </div>
      </section>

      <div className="flex flex-col gap-3 border-b border-border pb-2 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-wrap gap-2">
          {SECTION_ORDER.map((section) => (
            <button
              key={section}
              onClick={() => {
                setActiveSection(section);
                setSearch("");
                setActionError(null);
              }}
              className={`rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                activeSection === section
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {SECTION_META[section].label}
            </button>
          ))}
        </div>

        {activeSection !== "exports" && (
          <button
            onClick={() => openCreateModal(activeSection)}
            className="inline-flex w-full min-w-[148px] items-center justify-center gap-2 self-start rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 sm:w-auto xl:self-auto"
          >
            <Plus size={15} />
            {SECTION_META[activeSection].addLabel}
          </button>
        )}
      </div>

      {activeSection === "exports" ? (
        <section className="space-y-4 rounded-lg bg-card p-4 shadow-card sm:p-5">
          <div className="flex flex-col gap-2 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                ייצוא חכם
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                ייצוא כל הטבלאות, טבלה בודדת או אוכלוסיית עובדים מסוננת לפי מחלקה, הכשרה, רישיון וסטטוס.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={exportAllTargets}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                <Download size={14} />
                יצוא כל הטבלאות
              </button>
              <button
                onClick={() => exportSingleTarget(exportTarget as Exclude<ExportTarget, "all">)}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                <Download size={14} />
                יצוא הבחירה הנוכחית
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">טבלה</label>
              <select
                value={exportTarget}
                onChange={(event) => setExportTarget(event.target.value as ExportTarget)}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              >
                <option value="employees">עובדים</option>
                <option value="departments">מחלקות</option>
                <option value="vehicles">רכבים</option>
                <option value="vehicleTasks">משימות רכב</option>
                <option value="missions">משימות</option>
                <option value="equipmentLedger">רשומת ציוד</option>
                <option value="foodProducts">מוצרי מזון</option>
                <option value="foodTransactions">תנועות מזון</option>
                <option value="apartments">דירות</option>
                <option value="qualifications">הכשרות</option>
                <option value="drivingLicenses">רישיונות נהיגה</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">מחלקה</label>
              <select
                value={exportDepartment}
                onChange={(event) => setExportDepartment(event.target.value)}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              >
                <option value="all">כל המחלקות</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.name}>
                    {department.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">הכשרה</label>
              <select
                value={exportQualification}
                onChange={(event) => setExportQualification(event.target.value)}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              >
                <option value="all">כל ההכשרות</option>
                {qualifications.map((qualification) => (
                  <option key={qualification.id} value={qualification.id}>
                    {qualification.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">רישיון נהיגה</label>
              <select
                value={exportDrivingLicense}
                onChange={(event) => setExportDrivingLicense(event.target.value)}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              >
                <option value="all">כל הרישיונות</option>
                {drivingLicenses.map((license) => (
                  <option key={license.id} value={license.id}>
                    {license.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">סטטוס עובד</label>
              <select
                value={exportStatus}
                onChange={(event) => setExportStatus(event.target.value)}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                dir="rtl"
              >
                <option value="all">הכל</option>
                <option value="active">פעיל</option>
                <option value="reserve">מילואים</option>
                <option value="inactive">לא פעיל</option>
              </select>
            </div>
          </div>

          <div className="rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
            {exportTarget === "employees"
              ? `הייצוא הנוכחי יחזיר ${exportEmployeeRows.length} עובדים לאחר סינון.`
              : `הייצוא הנוכחי יחזיר ${Math.max(0, exportRowsByTarget[exportTarget].length - 1)} שורות.`}
          </div>
        </section>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={`חיפוש ב-${SECTION_META[activeSection].label}...`}
              className="w-full md:w-72"
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {SECTION_META[activeSection].icon}
              {SECTION_META[activeSection].label}
            </div>
          </div>

          <DataTable
            columns={sectionContent[activeSection].columns}
            data={sectionContent[activeSection].data}
            rowKey={sectionContent[activeSection].rowKey}
            emptyMessage={sectionContent[activeSection].emptyMessage}
            minWidthClassName="min-w-[56rem]"
          />
        </>
      )}

      <Modal
        open={createModal !== null}
        onClose={closeCreateModal}
        title={createModal ? SECTION_META[createModal].addLabel || "הוספה" : "הוספה"}
        width="max-w-3xl"
      >
        <div className="flex flex-col gap-5">
          {renderCreateForm()}
          {actionError && <p className="text-sm text-status-danger-text">{actionError}</p>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              onClick={submitCreate}
              disabled={isSaving}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
            >
              {isSaving ? "שומר..." : "שמור"}
            </button>
            <button
              onClick={closeCreateModal}
              className="w-full rounded-md px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted sm:w-auto"
            >
              ביטול
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={deleteTarget !== null}
        onClose={() => {
          setDeleteTarget(null);
          setActionError(null);
        }}
        title={deleteTarget ? `מחיקת ${deleteTarget.label}` : "מחיקה"}
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-6 text-muted-foreground">
            המחיקה תתבצע רק אם אין תלותים פעילים שמסכנים את שלמות הנתונים.
          </p>
          {actionError && <p className="text-sm text-status-danger-text">{actionError}</p>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <button
              onClick={confirmDelete}
              disabled={isSaving}
              className="w-full rounded-md bg-status-danger-text px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60 sm:w-auto"
            >
              {isSaving ? "מוחק..." : "אשר מחיקה"}
            </button>
            <button
              onClick={() => {
                setDeleteTarget(null);
                setActionError(null);
              }}
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
