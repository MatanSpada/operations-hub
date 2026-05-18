import React, { useEffect, useMemo, useState } from "react";
import {
  Building2,
  ClipboardList,
  LayoutDashboard,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Settings2,
  DatabaseZap,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { SearchInput } from "@/components/shared/SearchInput";
import { Modal } from "@/components/shared/Modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { supplyControlApi } from "@/modules/apartment-supply-control/api";
import {
  SupplyApartment,
  SupplyApartmentInput,
  SupplyRequiredType,
  SupplyStandardItem,
  SupplyStandardItemInput,
} from "@/types";

type ApartmentSupplySection = "dashboard" | "reports" | "settings";
type SettingsModalState =
  | { type: "createApartment" }
  | { type: "editApartment"; apartment: SupplyApartment }
  | { type: "createItem"; apartment: SupplyApartment }
  | { type: "editItem"; apartment: SupplyApartment; item: SupplyStandardItem }
  | { type: "deactivateApartment"; apartment: SupplyApartment }
  | { type: "deactivateItem"; apartment: SupplyApartment; item: SupplyStandardItem }
  | null;

const SECTION_LABELS: Record<ApartmentSupplySection, string> = {
  dashboard: "דשבורד",
  reports: "דיווחים",
  settings: "הגדרות",
};

const SECTION_ICONS: Record<ApartmentSupplySection, React.ReactNode> = {
  dashboard: <LayoutDashboard size={16} />,
  reports: <ClipboardList size={16} />,
  settings: <Settings2 size={16} />,
};

const REQUIRED_TYPE_LABELS: Record<SupplyRequiredType, string> = {
  exists: "קיים",
  quantity: "כמות",
  text: "טקסט",
};

const CATEGORY_OPTIONS = ["מקרר", "ציוד ניקוי אקסטרה", "מצעים", "חריגים", "ציוד כללי"] as const;

const EMPTY_APARTMENT_FORM: SupplyApartmentInput = {
  location: "",
  mission: "",
  type: "דירה",
  notes: "",
};

const EMPTY_ITEM_FORM = (apartmentId = ""): SupplyStandardItemInput => ({
  apartment_id: apartmentId,
  category: "ציוד כללי",
  item_name: "",
  required_value: "",
  required_type: "quantity",
  photo_required: false,
  notes: "",
});

function formatApartmentLabel(apartment: SupplyApartment): string {
  return `${apartment.location} · ${apartment.mission}`;
}

function ApartmentCard({
  apartment,
  isSelected,
  onClick,
}: {
  apartment: SupplyApartment;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full rounded-lg border p-4 text-right transition-colors",
        isSelected
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-border bg-card hover:bg-muted/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">{apartment.location}</div>
          <div className="mt-1 text-sm text-muted-foreground">{apartment.mission}</div>
        </div>
        <span className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{apartment.type}</span>
      </div>
      {apartment.notes && <p className="mt-3 text-xs leading-5 text-muted-foreground">{apartment.notes}</p>}
    </button>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}

type ApartmentSupplyControlPageProps = {
  initialSection?: ApartmentSupplySection;
};

export const ApartmentSupplyControlPage: React.FC<ApartmentSupplyControlPageProps> = ({
  initialSection = "dashboard",
}) => {
  const [activeSection, setActiveSection] = useState<ApartmentSupplySection>(initialSection);
  const [apartments, setApartments] = useState<SupplyApartment[]>([]);
  const [items, setItems] = useState<SupplyStandardItem[]>([]);
  const [selectedApartmentId, setSelectedApartmentId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [settingsModal, setSettingsModal] = useState<SettingsModalState>(null);
  const [apartmentForm, setApartmentForm] = useState<SupplyApartmentInput>(EMPTY_APARTMENT_FORM);
  const [itemForm, setItemForm] = useState<SupplyStandardItemInput>(EMPTY_ITEM_FORM());
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const filteredApartments = useMemo(() => {
    const normalizedSearch = search.trim();
    if (!normalizedSearch) return apartments;

    return apartments.filter((apartment) =>
      [apartment.location, apartment.mission, apartment.type, apartment.notes ?? ""].some((value) =>
        value.toLocaleLowerCase().includes(normalizedSearch.toLocaleLowerCase()),
      ),
    );
  }, [apartments, search]);

  const selectedApartment = useMemo(
    () => apartments.find((apartment) => apartment.apartment_id === selectedApartmentId) ?? null,
    [apartments, selectedApartmentId],
  );

  async function loadApartments(preferredApartmentId?: string) {
    setSettingsLoading(true);
    setSettingsError(null);

    const result = await supplyControlApi.getSupplyApartments();
    if (!result.data) {
      setApartments([]);
      setSelectedApartmentId("");
      setSettingsError(result.error || "טעינת הדירות נכשלה");
      setSettingsLoading(false);
      return;
    }

    setApartments(result.data);
    setSelectedApartmentId((current) => {
      const requestedId = preferredApartmentId ?? current;
      if (requestedId && result.data.some((apartment) => apartment.apartment_id === requestedId)) {
        return requestedId;
      }
      return result.data[0]?.apartment_id ?? "";
    });
    setSettingsLoading(false);
  }

  async function loadItems(apartmentId: string) {
    if (!apartmentId) {
      setItems([]);
      return;
    }

    setItemsLoading(true);
    const result = await supplyControlApi.getSupplyStandardItems(apartmentId);
    if (!result.data) {
      setItems([]);
      toast({
        variant: "destructive",
        title: "שגיאה בטעינת תקן האספקה",
        description: result.error || "לא ניתן לטעון את הפריטים הקבועים לדירה",
      });
      setItemsLoading(false);
      return;
    }

    setItems(result.data);
    setItemsLoading(false);
  }

  useEffect(() => {
    if (activeSection !== "settings") return;
    void loadApartments();
  }, [activeSection]);

  useEffect(() => {
    if (activeSection !== "settings") return;
    void loadItems(selectedApartmentId);
  }, [activeSection, selectedApartmentId]);

  function openCreateApartmentModal() {
    setApartmentForm(EMPTY_APARTMENT_FORM);
    setSettingsModal({ type: "createApartment" });
  }

  function openEditApartmentModal(apartment: SupplyApartment) {
    setApartmentForm({
      location: apartment.location,
      mission: apartment.mission,
      type: apartment.type,
      notes: apartment.notes ?? "",
      active: apartment.active,
      report_token: apartment.report_token,
    });
    setSettingsModal({ type: "editApartment", apartment });
  }

  function openCreateItemModal(apartment: SupplyApartment) {
    setItemForm(EMPTY_ITEM_FORM(apartment.apartment_id));
    setSettingsModal({ type: "createItem", apartment });
  }

  function openEditItemModal(apartment: SupplyApartment, item: SupplyStandardItem) {
    setItemForm({
      apartment_id: apartment.apartment_id,
      category: item.category,
      item_name: item.item_name,
      required_value: item.required_value ?? "",
      required_type: item.required_type,
      photo_required: item.photo_required,
      notes: item.notes ?? "",
      active: item.active,
    });
    setSettingsModal({ type: "editItem", apartment, item });
  }

  async function handleSaveApartment() {
    const payload: SupplyApartmentInput = {
      location: apartmentForm.location.trim(),
      mission: apartmentForm.mission.trim(),
      type: apartmentForm.type.trim(),
      notes: apartmentForm.notes?.trim() ?? "",
    };

    if (!payload.location || !payload.mission || !payload.type) {
      toast({
        variant: "destructive",
        title: "שדות חסרים",
        description: "יש למלא מיקום, משימה וסוג דירה",
      });
      return;
    }

    setIsSaving(true);

    const result =
      settingsModal?.type === "editApartment"
        ? await supplyControlApi.updateSupplyApartment(settingsModal.apartment.apartment_id, payload)
        : await supplyControlApi.createSupplyApartment(payload);

    if (!result.data) {
      toast({
        variant: "destructive",
        title: "שמירת הדירה נכשלה",
        description: result.error || "לא ניתן לשמור את פרטי הדירה",
      });
      setIsSaving(false);
      return;
    }

    await loadApartments(result.data.apartment_id);
    setSettingsModal(null);
    toast({
      title: settingsModal?.type === "editApartment" ? "הדירה עודכנה" : "הדירה נוספה",
      description: formatApartmentLabel(result.data),
    });
    setIsSaving(false);
  }

  async function handleSaveItem() {
    const payload: SupplyStandardItemInput = {
      apartment_id: itemForm.apartment_id,
      category: itemForm.category.trim(),
      item_name: itemForm.item_name.trim(),
      required_value: itemForm.required_value?.trim() ?? "",
      required_type: itemForm.required_type,
      photo_required: itemForm.photo_required,
      notes: itemForm.notes?.trim() ?? "",
    };

    if (!payload.apartment_id || !payload.category || !payload.item_name) {
      toast({
        variant: "destructive",
        title: "שדות חסרים",
        description: "יש למלא קטגוריה, שם פריט ודירה",
      });
      return;
    }

    setIsSaving(true);

    const result =
      settingsModal?.type === "editItem"
        ? await supplyControlApi.updateSupplyStandardItem(settingsModal.item.standard_item_id, payload)
        : await supplyControlApi.createSupplyStandardItem(payload);

    if (!result.data) {
      toast({
        variant: "destructive",
        title: "שמירת הפריט נכשלה",
        description: result.error || "לא ניתן לשמור את פריט התקן",
      });
      setIsSaving(false);
      return;
    }

    await loadItems(payload.apartment_id);
    setSettingsModal(null);
    toast({
      title: settingsModal?.type === "editItem" ? "פריט התקן עודכן" : "פריט התקן נוסף",
      description: result.data.item_name,
    });
    setIsSaving(false);
  }

  async function handleDeactivate() {
    if (!settingsModal) return;

    setIsSaving(true);

    if (settingsModal.type === "deactivateApartment") {
      const result = await supplyControlApi.deactivateSupplyApartment(settingsModal.apartment.apartment_id);
      if (!result.data) {
        toast({
          variant: "destructive",
          title: "נטרול הדירה נכשל",
          description: result.error || "לא ניתן לנטרל את הדירה",
        });
        setIsSaving(false);
        return;
      }

      await loadApartments();
      setSettingsModal(null);
      toast({
        title: "הדירה נוטרלה",
        description: settingsModal.apartment.location,
      });
      setIsSaving(false);
      return;
    }

    const result = await supplyControlApi.deactivateSupplyStandardItem(settingsModal.item.standard_item_id);
    if (!result.data) {
      toast({
        variant: "destructive",
        title: "נטרול הפריט נכשל",
        description: result.error || "לא ניתן לנטרל את פריט התקן",
      });
      setIsSaving(false);
      return;
    }

    await loadItems(settingsModal.apartment.apartment_id);
    setSettingsModal(null);
    toast({
      title: "פריט התקן נוטרל",
      description: settingsModal.item.item_name,
    });
    setIsSaving(false);
  }

  async function handleSeedDemoData() {
    setIsSaving(true);
    const result = await supplyControlApi.seedSupplyDemoData();
    if (!result.data) {
      toast({
        variant: "destructive",
        title: "טעינת נתוני הדמה נכשלה",
        description: result.error || "לא ניתן לטעון את נתוני הדמה",
      });
      setIsSaving(false);
      return;
    }

    await loadApartments();
    toast({
      title: "נתוני הדמה נטענו",
      description: `דירות: ${result.data.apartments}, פריטים: ${result.data.items}`,
    });
    setIsSaving(false);
  }

  const itemColumns = [
    {
      key: "item_name",
      header: "פריט",
      render: (item: SupplyStandardItem) => <span className="font-medium text-foreground">{item.item_name}</span>,
    },
    { key: "category", header: "קטגוריה" },
    {
      key: "required_value",
      header: "ערך נדרש",
      render: (item: SupplyStandardItem) => item.required_value || "קיים",
    },
    {
      key: "required_type",
      header: "סוג דרישה",
      render: (item: SupplyStandardItem) => REQUIRED_TYPE_LABELS[item.required_type],
    },
    {
      key: "photo_required",
      header: "צילום חובה",
      render: (item: SupplyStandardItem) => (item.photo_required ? "כן" : "לא"),
    },
    {
      key: "actions",
      header: "פעולות",
      className: "w-[10rem]",
      render: (item: SupplyStandardItem) => (
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (selectedApartment) {
                openEditItemModal(selectedApartment, item);
              }
            }}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-foreground hover:bg-muted"
          >
            <Pencil size={12} />
            ערוך
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (selectedApartment) {
                setSettingsModal({ type: "deactivateItem", apartment: selectedApartment, item });
              }
            }}
            className="inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2.5 py-1.5 text-xs text-status-danger-text hover:bg-destructive/5"
          >
            <Power size={12} />
            נטרל
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="בקרת אספקת דירות"
        subtitle="ניהול דירות, תקן אספקה קבוע, ודאטה תפעולי מוכן להמשך השלבים."
      />

      <Card className="shadow-card">
        <CardHeader className="gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Building2 size={16} />
            <span>ניהול מודול</span>
          </div>
          <Tabs
            dir="rtl"
            value={activeSection}
            onValueChange={(value) => setActiveSection(value as ApartmentSupplySection)}
          >
            <TabsList className="h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
              {(Object.keys(SECTION_LABELS) as ApartmentSupplySection[]).map((section) => (
                <TabsTrigger
                  key={section}
                  value={section}
                  className="gap-2 rounded-md border border-border px-4 py-2 text-sm data-[state=active]:border-primary data-[state=active]:bg-primary/5 data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  <span className="shrink-0">{SECTION_ICONS[section]}</span>
                  <span>{SECTION_LABELS[section]}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="dashboard" className="mt-6">
              <Card className="border-dashed shadow-none">
                <CardContent className="flex min-h-40 items-center justify-center p-6 sm:min-h-48">
                  <CardTitle className="text-lg">דשבורד בקרת אספקה</CardTitle>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="reports" className="mt-6">
              <Card className="border-dashed shadow-none">
                <CardContent className="flex min-h-40 items-center justify-center p-6 sm:min-h-48">
                  <CardTitle className="text-lg">דיווחים לפי דירה</CardTitle>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="mt-6 space-y-6">
              <PageHeader
                title="הגדרות בקרת אספקה"
                subtitle="ניהול דירות ותקן אספקה קבוע לכל דירה"
                action={
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      onClick={openCreateApartmentModal}
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
                    >
                      <Plus size={15} />
                      הוסף דירה
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleSeedDemoData()}
                      disabled={isSaving}
                      className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
                    >
                      <DatabaseZap size={15} />
                      טען נתוני דמה
                    </button>
                  </div>
                }
              />

              <div className="grid gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
                <Card className="shadow-card">
                  <CardHeader className="gap-4">
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base">רשימת דירות</CardTitle>
                      <button
                        type="button"
                        onClick={() => void loadApartments(selectedApartmentId)}
                        className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <RefreshCw size={13} />
                        רענון
                      </button>
                    </div>
                    <SearchInput
                      value={search}
                      onChange={setSearch}
                      placeholder="חיפוש לפי מיקום, משימה או הערות"
                    />
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {settingsLoading ? (
                      <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                        טוען דירות...
                      </div>
                    ) : settingsError ? (
                      <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-4 text-sm text-status-danger-text">
                        {settingsError}
                      </div>
                    ) : filteredApartments.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                        אין עדיין דירות פעילות. אפשר להוסיף דירה חדשה או לטעון נתוני דמה.
                      </div>
                    ) : (
                      filteredApartments.map((apartment) => (
                        <ApartmentCard
                          key={apartment.apartment_id}
                          apartment={apartment}
                          isSelected={apartment.apartment_id === selectedApartmentId}
                          onClick={() => setSelectedApartmentId(apartment.apartment_id)}
                        />
                      ))
                    )}
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card className="shadow-card">
                    <CardHeader className="gap-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0">
                          <CardTitle className="text-base">
                            {selectedApartment ? formatApartmentLabel(selectedApartment) : "בחר דירה"}
                          </CardTitle>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {selectedApartment
                              ? "עריכת פרטי הדירה ותקן האספקה הקבוע שלה."
                              : "לאחר בחירת דירה יוצגו כאן פרטי הדירה והתקן הקבוע שלה."}
                          </p>
                        </div>
                        {selectedApartment && (
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => openEditApartmentModal(selectedApartment)}
                              className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-muted"
                            >
                              <Pencil size={14} />
                              ערוך דירה
                            </button>
                            <button
                              type="button"
                              onClick={() => setSettingsModal({ type: "deactivateApartment", apartment: selectedApartment })}
                              className="inline-flex items-center gap-2 rounded-md border border-destructive/30 px-3 py-2 text-sm text-status-danger-text hover:bg-destructive/5"
                            >
                              <Power size={14} />
                              נטרל דירה
                            </button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {!selectedApartment ? (
                        <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                          אין דירה נבחרת להצגה.
                        </div>
                      ) : (
                        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                          <div className="rounded-lg border border-border bg-muted/20 p-4">
                            <div className="text-xs text-muted-foreground">מיקום</div>
                            <div className="mt-1 text-sm font-medium">{selectedApartment.location}</div>
                          </div>
                          <div className="rounded-lg border border-border bg-muted/20 p-4">
                            <div className="text-xs text-muted-foreground">משימה</div>
                            <div className="mt-1 text-sm font-medium">{selectedApartment.mission}</div>
                          </div>
                          <div className="rounded-lg border border-border bg-muted/20 p-4">
                            <div className="text-xs text-muted-foreground">סוג</div>
                            <div className="mt-1 text-sm font-medium">{selectedApartment.type}</div>
                          </div>
                          <div className="rounded-lg border border-border bg-muted/20 p-4">
                            <div className="text-xs text-muted-foreground">הערות</div>
                            <div className="mt-1 text-sm font-medium">{selectedApartment.notes || "—"}</div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="shadow-card">
                    <CardHeader className="gap-4">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <CardTitle className="text-base">תקן אספקה קבוע</CardTitle>
                          <p className="mt-1 text-sm text-muted-foreground">
                            פריט | קטגוריה | ערך נדרש | סוג דרישה | צילום חובה | פעולות
                          </p>
                        </div>
                        {selectedApartment && (
                          <button
                            type="button"
                            onClick={() => openCreateItemModal(selectedApartment)}
                            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
                          >
                            <Plus size={14} />
                            הוסף פריט
                          </button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {!selectedApartment ? (
                        <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                          בחר דירה כדי לנהל את התקן הקבוע שלה.
                        </div>
                      ) : itemsLoading ? (
                        <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                          טוען תקן אספקה...
                        </div>
                      ) : (
                        <DataTable
                          columns={itemColumns}
                          data={items}
                          rowKey={(item) => item.standard_item_id}
                          emptyMessage="אין עדיין פריטי תקן לדירה זו"
                          minWidthClassName="min-w-[46rem]"
                        />
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardHeader>
      </Card>

      <Modal
        open={settingsModal?.type === "createApartment" || settingsModal?.type === "editApartment"}
        onClose={() => !isSaving && setSettingsModal(null)}
        title={settingsModal?.type === "editApartment" ? "עריכת דירה" : "הוספת דירה"}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="מיקום">
              <input
                value={apartmentForm.location}
                onChange={(event) => setApartmentForm((current) => ({ ...current, location: event.target.value }))}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              />
            </FormField>
            <FormField label="משימה">
              <input
                value={apartmentForm.mission}
                onChange={(event) => setApartmentForm((current) => ({ ...current, mission: event.target.value }))}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              />
            </FormField>
          </div>
          <FormField label="סוג">
            <input
              value={apartmentForm.type}
              onChange={(event) => setApartmentForm((current) => ({ ...current, type: event.target.value }))}
              className="h-10 rounded-md border border-border bg-background px-3 text-sm"
            />
          </FormField>
          <FormField label="הערות">
            <textarea
              value={apartmentForm.notes ?? ""}
              onChange={(event) => setApartmentForm((current) => ({ ...current, notes: event.target.value }))}
              className="min-h-24 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </FormField>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSettingsModal(null)}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
            >
              ביטול
            </button>
            <button
              type="button"
              onClick={() => void handleSaveApartment()}
              disabled={isSaving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {isSaving ? "שומר..." : "שמור"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={settingsModal?.type === "createItem" || settingsModal?.type === "editItem"}
        onClose={() => !isSaving && setSettingsModal(null)}
        title={settingsModal?.type === "editItem" ? "עריכת פריט תקן" : "הוספת פריט תקן"}
      >
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="פריט">
              <input
                value={itemForm.item_name}
                onChange={(event) => setItemForm((current) => ({ ...current, item_name: event.target.value }))}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              />
            </FormField>
            <FormField label="קטגוריה">
              <select
                value={itemForm.category}
                onChange={(event) => setItemForm((current) => ({ ...current, category: event.target.value }))}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              >
                {CATEGORY_OPTIONS.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="ערך נדרש">
              <input
                value={itemForm.required_value ?? ""}
                onChange={(event) => setItemForm((current) => ({ ...current, required_value: event.target.value }))}
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              />
            </FormField>
            <FormField label="סוג דרישה">
              <select
                value={itemForm.required_type}
                onChange={(event) =>
                  setItemForm((current) => ({ ...current, required_type: event.target.value as SupplyRequiredType }))
                }
                className="h-10 rounded-md border border-border bg-background px-3 text-sm"
              >
                {(Object.keys(REQUIRED_TYPE_LABELS) as SupplyRequiredType[]).map((requiredType) => (
                  <option key={requiredType} value={requiredType}>
                    {REQUIRED_TYPE_LABELS[requiredType]}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="הערות">
            <textarea
              value={itemForm.notes ?? ""}
              onChange={(event) => setItemForm((current) => ({ ...current, notes: event.target.value }))}
              className="min-h-24 rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
          </FormField>
          <label className="flex items-center justify-between rounded-md border border-border bg-muted/20 px-4 py-3 text-sm">
            <span className="font-medium text-foreground">צילום חובה</span>
            <input
              type="checkbox"
              checked={itemForm.photo_required}
              onChange={(event) => setItemForm((current) => ({ ...current, photo_required: event.target.checked }))}
              className="h-4 w-4 rounded border-border"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSettingsModal(null)}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
            >
              ביטול
            </button>
            <button
              type="button"
              onClick={() => void handleSaveItem()}
              disabled={isSaving}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {isSaving ? "שומר..." : "שמור"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={settingsModal?.type === "deactivateApartment" || settingsModal?.type === "deactivateItem"}
        onClose={() => !isSaving && setSettingsModal(null)}
        title="אישור נטרול"
        width="max-w-md"
      >
        <div className="space-y-4 text-sm">
          <p className="leading-6 text-muted-foreground">
            {settingsModal?.type === "deactivateApartment"
              ? `הדירה "${settingsModal.apartment.location}" תסומן כלא פעילה ולא תופיע במסכי הניהול והדיווח.`
              : settingsModal?.type === "deactivateItem"
                ? `הפריט "${settingsModal.item.item_name}" יוסר מהתקן הפעיל של הדירה "${settingsModal.apartment.location}".`
                : ""}
          </p>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setSettingsModal(null)}
              className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
            >
              ביטול
            </button>
            <button
              type="button"
              onClick={() => void handleDeactivate()}
              disabled={isSaving}
              className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-60"
            >
              {isSaving ? "שומר..." : "נטרל"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
