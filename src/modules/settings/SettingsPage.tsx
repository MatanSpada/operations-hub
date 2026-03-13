import React, { useMemo, useState } from "react";
import {
  Department,
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
  employeeStatusLabel,
  employeeStatusVariant,
  vehicleStatusLabel,
  vehicleStatusVariant,
} from "@/utils";
import {
  Database,
  Users,
  Award,
  ShoppingBasket,
  Truck,
  Plus,
  ShieldAlert,
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
  | "qualifications";

type DeleteTarget = {
  id: string;
  label: string;
  type: ManagementSection;
};

const SECTION_META: Record<
  ManagementSection,
  { label: string; addLabel: string; icon: React.ReactNode }
> = {
  employees: { label: "עובדים", addLabel: "הוספת עובד", icon: <Users size={16} /> },
  departments: { label: "מחלקות", addLabel: "הוספת מחלקה", icon: <Database size={16} /> },
  products: { label: "מוצרים לפי מחלקה", addLabel: "הוספת מוצר", icon: <ShoppingBasket size={16} /> },
  vehicles: { label: "רכבים", addLabel: "הוספת רכב", icon: <Truck size={16} /> },
  qualifications: { label: "הכשרות", addLabel: "הוספת הכשרה", icon: <Award size={16} /> },
};

function formatManagementError(error?: string): string {
  if (!error) return "הפעולה נכשלה";

  const errorMap: Record<string, string> = {
    "Department already exists": "מחלקה בשם הזה כבר קיימת",
    "Qualification already exists": "הכשרה בשם הזה כבר קיימת",
    "Vehicle already exists": "רכב עם אותה לוחית כבר קיים",
    "Employee already exists": "עובד בשם הזה כבר קיים",
    "Food product already exists": "מוצר בשם הזה כבר קיים",
    "Cannot delete department assigned to employees": "לא ניתן למחוק מחלקה שמשויכת לעובדים",
    "Cannot delete department used by active equipment issues": "לא ניתן למחוק מחלקה שמשויכת להוצאות ציוד פעילות",
    "Cannot delete department assigned to products": "לא ניתן למחוק מחלקה שמשויכת למוצרים",
    "Cannot delete product with inventory history": "לא ניתן למחוק מוצר עם היסטוריית מלאי",
    "Cannot delete a vehicle that is currently in use": "לא ניתן למחוק רכב שנמצא כרגע בשימוש",
    "Cannot delete a vehicle with an open trip": "לא ניתן למחוק רכב עם נסיעה פתוחה",
    "Cannot delete employee with active equipment loans": "לא ניתן למחוק עובד עם ציוד מושאל פעיל",
    "Cannot delete employee assigned to an active vehicle": "לא ניתן למחוק עובד שמשויך לרכב פעיל",
    "Department not found": "המחלקה שנבחרה לא נמצאה",
    "Employee not found": "העובד לא נמצא",
    "Vehicle not found": "הרכב לא נמצא",
    "Missing department name": "יש להזין שם מחלקה",
    "Missing qualification name": "יש להזין שם הכשרה",
    "Missing employee name": "יש להזין שם עובד",
    "Missing vehicle plate": "יש להזין לוחית רישוי",
    "Missing product name or category": "יש להזין שם מוצר וקטגוריה",
  };

  return errorMap[error] ?? error;
}

export const SettingsPage: React.FC<Props> = ({ data, onRefresh }) => {
  const {
    departments,
    employees,
    qualifications,
    employeeQualifications,
    vehicles,
    foodProducts,
    foodTransactions,
    equipmentLedger,
  } = data;

  const [activeSection, setActiveSection] = useState<ManagementSection>("employees");
  const [search, setSearch] = useState("");
  const [createModal, setCreateModal] = useState<ManagementSection | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [departmentForm, setDepartmentForm] = useState({ name: "" });
  const [qualificationForm, setQualificationForm] = useState({ name: "" });
  const [vehicleForm, setVehicleForm] = useState({ plate: "", notes: "" });
  const [employeeForm, setEmployeeForm] = useState({
    name: "",
    departmentId: departments[0]?.id ?? "",
    role: "",
    phone: "",
  });
  const [productForm, setProductForm] = useState({
    name: "",
    category: "",
    departmentId: departments[0]?.id ?? "",
    initialQuantity: "0",
  });

  const employeeQualificationCount = useMemo(() => {
    const counts = new Map<string, number>();
    employeeQualifications.forEach((assignment) => {
      counts.set(
        assignment.employeeId,
        (counts.get(assignment.employeeId) ?? 0) + 1
      );
    });
    return counts;
  }, [employeeQualifications]);

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

  const filteredDepartments = departmentRows.filter((department) =>
    department.name.includes(search)
  );
  const filteredQualifications = qualifications.filter((qualification) =>
    qualification.name.includes(search)
  );
  const filteredVehicles = vehicles.filter(
    (vehicle) =>
      vehicle.plate.includes(search) ||
      vehicle.currentDriver?.includes(search) ||
      vehicle.notes?.includes(search)
  );
  const filteredEmployees = employees.filter(
    (employee) =>
      employee.name.includes(search) ||
      employee.department.includes(search) ||
      employee.role?.includes(search) ||
      employee.phone?.includes(search)
  );
  const filteredProducts = productRows.filter(
    (product) =>
      product.name.includes(search) ||
      product.category.includes(search) ||
      product.department?.includes(search)
  );

  const openCreateModal = (section: ManagementSection) => {
    setCreateModal(section);
    setActionError(null);
    if (section === "employees") {
      setEmployeeForm((current) => ({
        ...current,
        departmentId: departments[0]?.id ?? current.departmentId,
      }));
    }
    if (section === "products") {
      setProductForm((current) => ({
        ...current,
        departmentId: departments[0]?.id ?? current.departmentId,
      }));
    }
  };

  const closeCreateModal = () => {
    setCreateModal(null);
    setActionError(null);
  };

  const submitCreate = async () => {
    setIsSaving(true);
    setActionError(null);

    try {
      if (createModal === "departments") {
        const result = await api.createDepartmentDetailed(departmentForm.name.trim());
        if (!result.data) {
          setActionError(formatManagementError(result.error));
          setIsSaving(false);
          return;
        }
        setDepartmentForm({ name: "" });
      }

      if (createModal === "qualifications") {
        const result = await api.createQualificationDetailed(qualificationForm.name.trim());
        if (!result.data) {
          setActionError(formatManagementError(result.error));
          setIsSaving(false);
          return;
        }
        setQualificationForm({ name: "" });
      }

      if (createModal === "vehicles") {
        const result = await api.createVehicleDetailed({
          plate: vehicleForm.plate.trim(),
          notes: vehicleForm.notes.trim() || undefined,
        });
        if (!result.data) {
          setActionError(formatManagementError(result.error));
          setIsSaving(false);
          return;
        }
        setVehicleForm({ plate: "", notes: "" });
      }

      if (createModal === "employees") {
        const result = await api.createEmployeeDetailed({
          name: employeeForm.name.trim(),
          departmentId: employeeForm.departmentId,
          role: employeeForm.role.trim() || undefined,
          phone: employeeForm.phone.trim() || undefined,
        });
        if (!result.data) {
          setActionError(formatManagementError(result.error));
          setIsSaving(false);
          return;
        }
        setEmployeeForm({
          name: "",
          departmentId: departments[0]?.id ?? "",
          role: "",
          phone: "",
        });
      }

      if (createModal === "products") {
        const result = await api.createFoodProductDetailed({
          name: productForm.name.trim(),
          category: productForm.category.trim(),
          departmentId: productForm.departmentId,
          initialQuantity: Number(productForm.initialQuantity || 0),
        });
        if (!result.data) {
          setActionError(formatManagementError(result.error));
          setIsSaving(false);
          return;
        }
        setProductForm({
          name: "",
          category: "",
          departmentId: departments[0]?.id ?? "",
          initialQuantity: "0",
        });
      }

      closeCreateModal();
      setIsSaving(false);
      await onRefresh();
    } catch (error) {
      setActionError(formatManagementError(error instanceof Error ? error.message : undefined));
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setIsSaving(true);
    setActionError(null);

    let result;
    if (deleteTarget.type === "departments") {
      result = await api.deleteDepartmentDetailed(deleteTarget.id);
    }
    if (deleteTarget.type === "qualifications") {
      result = await api.deleteQualificationDetailed(deleteTarget.id);
    }
    if (deleteTarget.type === "products") {
      result = await api.deleteFoodProductDetailed(deleteTarget.id);
    }
    if (deleteTarget.type === "vehicles") {
      result = await api.deleteVehicleDetailed(deleteTarget.id);
    }
    if (deleteTarget.type === "employees") {
      result = await api.deleteEmployeeDetailed(deleteTarget.id);
    }

    if (!result?.data) {
      setActionError(formatManagementError(result?.error));
      setIsSaving(false);
      return;
    }

    setDeleteTarget(null);
    setActionError(null);
    setIsSaving(false);
    await onRefresh();
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
            setDeleteTarget({
              id: department.id,
              label: department.name,
              type: "departments",
            })
          }
          className="text-xs text-status-danger-text hover:underline font-medium"
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
        employeeQualifications.filter(
          (assignment) => assignment.qualificationId === qualification.id
        ).length,
    },
    {
      key: "actions",
      header: "פעולות",
      render: (qualification: Qualification) => (
        <button
          onClick={() =>
            setDeleteTarget({
              id: qualification.id,
              label: qualification.name,
              type: "qualifications",
            })
          }
          className="text-xs text-status-danger-text hover:underline font-medium"
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
          onClick={() =>
            setDeleteTarget({
              id: product.id,
              label: product.name,
              type: "products",
            })
          }
          className="text-xs text-status-danger-text hover:underline font-medium"
        >
          מחק
        </button>
      ),
    },
  ];

  const vehicleColumns = [
    { key: "plate", header: "לוחית רישוי" },
    {
      key: "status",
      header: "סטטוס",
      render: (vehicle: Vehicle) => (
        <Badge variant={vehicleStatusVariant(vehicle.status)}>
          {vehicleStatusLabel(vehicle.status)}
        </Badge>
      ),
    },
    { key: "currentDriver", header: "נהג נוכחי" },
    { key: "notes", header: "הערות" },
    {
      key: "actions",
      header: "פעולות",
      render: (vehicle: Vehicle) => (
        <button
          onClick={() =>
            setDeleteTarget({
              id: vehicle.plate,
              label: vehicle.plate,
              type: "vehicles",
            })
          }
          className="text-xs text-status-danger-text hover:underline font-medium"
        >
          מחק
        </button>
      ),
    },
  ];

  const employeeColumns = [
    { key: "name", header: "עובד" },
    { key: "department", header: "מחלקה" },
    { key: "role", header: "תפקיד" },
    { key: "phone", header: "טלפון" },
    {
      key: "status",
      header: "סטטוס",
      render: (employee: Employee) => (
        <Badge variant={employeeStatusVariant(employee.status)}>
          {employeeStatusLabel(employee.status)}
        </Badge>
      ),
    },
    {
      key: "qualifications",
      header: "הכשרות",
      render: (employee: Employee) => employeeQualificationCount.get(employee.id) ?? 0,
    },
    {
      key: "actions",
      header: "פעולות",
      render: (employee: Employee) => (
        <button
          onClick={() =>
            setDeleteTarget({
              id: employee.id,
              label: employee.name,
              type: "employees",
            })
          }
          className="text-xs text-status-danger-text hover:underline font-medium"
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
      rowKey: (employee: Employee) => employee.id,
    },
  }[activeSection];

  const renderCreateForm = () => {
    if (createModal === "departments") {
      return (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">שם מחלקה</label>
            <input
              type="text"
              value={departmentForm.name}
              onChange={(e) => setDepartmentForm({ name: e.target.value })}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              dir="rtl"
            />
          </div>
        </div>
      );
    }

    if (createModal === "qualifications") {
      return (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">שם הכשרה</label>
            <input
              type="text"
              value={qualificationForm.name}
              onChange={(e) => setQualificationForm({ name: e.target.value })}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              dir="rtl"
            />
          </div>
        </div>
      );
    }

    if (createModal === "vehicles") {
      return (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">לוחית רישוי</label>
            <input
              type="text"
              value={vehicleForm.plate}
              onChange={(e) => setVehicleForm({ ...vehicleForm, plate: e.target.value })}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              dir="rtl"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">הערות (אופציונלי)</label>
            <input
              type="text"
              value={vehicleForm.notes}
              onChange={(e) => setVehicleForm({ ...vehicleForm, notes: e.target.value })}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              dir="rtl"
            />
          </div>
        </div>
      );
    }

    if (createModal === "employees") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">שם עובד</label>
            <input
              type="text"
              value={employeeForm.name}
              onChange={(e) => setEmployeeForm({ ...employeeForm, name: e.target.value })}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              dir="rtl"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">מחלקה</label>
            <select
              value={employeeForm.departmentId}
              onChange={(e) => setEmployeeForm({ ...employeeForm, departmentId: e.target.value })}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
              onChange={(e) => setEmployeeForm({ ...employeeForm, role: e.target.value })}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              dir="rtl"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">טלפון</label>
            <input
              type="text"
              value={employeeForm.phone}
              onChange={(e) => setEmployeeForm({ ...employeeForm, phone: e.target.value })}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              dir="rtl"
            />
          </div>
        </div>
      );
    }

    if (createModal === "products") {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">שם מוצר</label>
            <input
              type="text"
              value={productForm.name}
              onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              dir="rtl"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">קטגוריה</label>
            <input
              type="text"
              value={productForm.category}
              onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              dir="rtl"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium">מחלקה</label>
            <select
              value={productForm.departmentId}
              onChange={(e) => setProductForm({ ...productForm, departmentId: e.target.value })}
              className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
              onChange={(e) =>
                setProductForm({ ...productForm, initialQuantity: e.target.value })
              }
              className="h-9 px-3 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
        subtitle="ניהול בטוח של ישויות ליבה, עם הגנות על תלותים ונתונים היסטוריים"
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <SummaryCard label="עובדים" value={employees.length} icon={<Users size={18} />} />
        <SummaryCard label="מחלקות" value={departments.length} icon={<Database size={18} />} />
        <SummaryCard label="מוצרים" value={foodProducts.length} icon={<ShoppingBasket size={18} />} />
        <SummaryCard label="רכבים" value={vehicles.length} icon={<Truck size={18} />} />
        <SummaryCard label="הכשרות" value={qualifications.length} icon={<Award size={18} />} />
      </div>

      <section className="bg-card rounded-lg shadow-card p-5 flex items-start gap-3">
        <ShieldAlert size={18} className="text-status-warning-text mt-0.5" />
        <div className="text-sm text-muted-foreground leading-6">
          מחיקה מתבצעת רק כאשר אין תלותים פעילים, או עם ניקוי מבוקר של קשרי שיוך.
          עובדים עם ציוד פעיל או רכבים בשימוש ייחסמו, מחלקות עם עובדים או מוצרים ייחסמו,
          ומוצרים עם היסטוריית מלאי לא יימחקו.
        </div>
      </section>

      <div className="flex flex-col gap-3 border-b border-border pb-2 xl:flex-row xl:items-end xl:justify-between">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SECTION_META) as ManagementSection[]).map((section) => (
            <button
              key={section}
              onClick={() => {
                setActiveSection(section);
                setSearch("");
                setActionError(null);
              }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeSection === section
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {SECTION_META[section].label}
            </button>
          ))}
        </div>

        <button
          onClick={() => openCreateModal(activeSection)}
          className="inline-flex min-w-[148px] items-center justify-center gap-2 self-start bg-primary px-4 py-2 text-sm font-medium text-primary-foreground rounded-md transition-opacity hover:opacity-90 xl:self-auto"
        >
          <Plus size={15} />
          {SECTION_META[activeSection].addLabel}
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder={`חיפוש ב-${SECTION_META[activeSection].label}...`}
          className="w-full md:w-72"
        />
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          {SECTION_META[activeSection].icon}
          {SECTION_META[activeSection].label}
        </div>
      </div>

      <DataTable
        columns={sectionContent.columns}
        data={sectionContent.data}
        rowKey={sectionContent.rowKey}
        emptyMessage={sectionContent.emptyMessage}
      />

      <Modal
        open={createModal !== null}
        onClose={closeCreateModal}
        title={createModal ? SECTION_META[createModal].addLabel : "הוספה"}
        width="max-w-2xl"
      >
        <div className="flex flex-col gap-5">
          {renderCreateForm()}
          {actionError && <p className="text-sm text-status-danger-text">{actionError}</p>}
          <div className="flex gap-3">
            <button
              onClick={submitCreate}
              disabled={isSaving}
              className="bg-primary text-primary-foreground text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {isSaving ? "שומר..." : "שמור"}
            </button>
            <button
              onClick={closeCreateModal}
              className="text-sm font-medium text-muted-foreground px-4 py-2 rounded-md hover:bg-muted transition-colors"
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
          <p className="text-sm text-muted-foreground leading-6">
            המחיקה תתבצע רק אם אין תלותים פעילים שמסכנים את שלמות הנתונים.
          </p>
          {actionError && <p className="text-sm text-status-danger-text">{actionError}</p>}
          <div className="flex gap-3">
            <button
              onClick={confirmDelete}
              disabled={isSaving}
              className="bg-status-danger-text text-white text-sm font-medium px-4 py-2 rounded-md hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {isSaving ? "מוחק..." : "אשר מחיקה"}
            </button>
            <button
              onClick={() => {
                setDeleteTarget(null);
                setActionError(null);
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
