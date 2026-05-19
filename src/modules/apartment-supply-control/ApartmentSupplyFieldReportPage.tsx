import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Building2, CheckCircle2, ClipboardCheck, ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supplyControlApi } from "@/modules/apartment-supply-control/api";
import {
  SupplyApartment,
  SupplyCreateReportInput,
  SupplyCreateReportResult,
  SupplyPhotoCategory,
  SupplyReportedStatus,
  SupplyReportingContext,
  SupplyReportingContextParams,
  SupplyRequiredType,
  SupplyStandardItem,
  SupplyUpdateReportInput,
  SupplyUploadReportPhotoInput,
} from "@/types";

type ReportItemFormState = {
  reported_status: SupplyReportedStatus;
  actual_value: string;
  item_notes: string;
};

type PendingPhoto = {
  id: string;
  file: File;
  previewUrl: string;
  category: SupplyPhotoCategory;
  notes: string;
};

type FieldReportPageProps = SupplyReportingContextParams;

const REQUIRED_TYPE_LABELS: Record<SupplyRequiredType, string> = {
  exists: "קיים",
  quantity: "כמות",
  text: "טקסט",
};

const STATUS_OPTIONS: Array<{ value: SupplyReportedStatus; label: string }> = [
  { value: "ok", label: "תקין" },
  { value: "missing", label: "חסר" },
  { value: "partial", label: "חלקי" },
  { value: "not_relevant", label: "לא רלוונטי" },
];

const PHOTO_CATEGORIES: SupplyPhotoCategory[] = ["מקרר", "ציוד ניקוי אקסטרה", "מצעים", "חריגים"];
const CATEGORY_ORDER = ["מקרר", "ציוד ניקוי אקסטרה", "מצעים", "חריגים", "ציוד כללי"] as const;
const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024;

function buildInitialItemStates(items: SupplyStandardItem[]): Record<string, ReportItemFormState> {
  return items.reduce<Record<string, ReportItemFormState>>((result, item) => {
    result[item.standard_item_id] = {
      reported_status: "ok",
      actual_value: "",
      item_notes: "",
    };
    return result;
  }, {});
}

function buildInitialPendingPhotos(): Record<SupplyPhotoCategory, PendingPhoto[]> {
  return {
    מקרר: [],
    "ציוד ניקוי אקסטרה": [],
    מצעים: [],
    חריגים: [],
  };
}

function formatRequiredValue(item: SupplyStandardItem): string {
  return item.required_value?.trim() || "קיים";
}

function groupItemsByCategory(items: SupplyStandardItem[]) {
  const groups = new Map<string, SupplyStandardItem[]>();

  items.forEach((item) => {
    const existing = groups.get(item.category) || [];
    existing.push(item);
    groups.set(item.category, existing);
  });

  return [...groups.entries()].sort(([left], [right]) => {
    const leftIndex = CATEGORY_ORDER.indexOf(left as (typeof CATEGORY_ORDER)[number]);
    const rightIndex = CATEGORY_ORDER.indexOf(right as (typeof CATEGORY_ORDER)[number]);

    if (leftIndex === -1 && rightIndex === -1) return left.localeCompare(right, "he");
    if (leftIndex === -1) return 1;
    if (rightIndex === -1) return -1;
    return leftIndex - rightIndex;
  });
}

function revokePendingPhotos(photosByCategory: Record<SupplyPhotoCategory, PendingPhoto[]>) {
  PHOTO_CATEGORIES.forEach((category) => {
    photosByCategory[category].forEach((photo) => {
      URL.revokeObjectURL(photo.previewUrl);
    });
  });
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const [, base64Data = ""] = result.split(",");
      resolve(base64Data);
    };
    reader.onerror = () => {
      reject(new Error(`קריאת הקובץ נכשלה: ${file.name}`));
    };
    reader.readAsDataURL(file);
  });
}

async function buildPhotoUploadPayload(
  photosByCategory: Record<SupplyPhotoCategory, PendingPhoto[]>,
): Promise<SupplyUploadReportPhotoInput[]> {
  const uploadedPhotos: SupplyUploadReportPhotoInput[] = [];

  for (const category of PHOTO_CATEGORIES) {
    for (const photo of photosByCategory[category]) {
      uploadedPhotos.push({
        category,
        filename: photo.file.name,
        mime_type: photo.file.type,
        base64_data: await readFileAsBase64(photo.file),
        notes: photo.notes,
      });
    }
  }

  return uploadedPhotos;
}

function ApartmentIdentity({ apartment }: { apartment: SupplyApartment }) {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Building2 size={16} />
          <span>פרטי הדירה</span>
        </div>
        <CardTitle className="text-xl">{apartment.location}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-lg bg-muted/40 p-3">
          <div className="text-muted-foreground">משימה</div>
          <div className="mt-1 font-medium">{apartment.mission}</div>
        </div>
        <div className="rounded-lg bg-muted/40 p-3">
          <div className="text-muted-foreground">סוג</div>
          <div className="mt-1 font-medium">{apartment.type}</div>
        </div>
        <div className="rounded-lg bg-muted/40 p-3">
          <div className="text-muted-foreground">טוקן דיווח</div>
          <div className="mt-1 break-all font-medium">{apartment.report_token || "לא הוגדר"}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export const ApartmentSupplyFieldReportPage: React.FC<FieldReportPageProps> = ({
  apartmentId,
  reportToken,
}) => {
  const [context, setContext] = useState<SupplyReportingContext | null>(null);
  const [availableApartments, setAvailableApartments] = useState<SupplyApartment[]>([]);
  const [selectedApartmentId, setSelectedApartmentId] = useState(apartmentId || "");
  const [reporterInitials, setReporterInitials] = useState("");
  const [generalNotes, setGeneralNotes] = useState("");
  const [itemStates, setItemStates] = useState<Record<string, ReportItemFormState>>({});
  const [loading, setLoading] = useState(true);
  const [loadingApartments, setLoadingApartments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successResult, setSuccessResult] = useState<SupplyCreateReportResult | null>(null);
  const [submittedReportId, setSubmittedReportId] = useState<string | null>(null);
  const [isEditingSubmittedReport, setIsEditingSubmittedReport] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<Record<SupplyPhotoCategory, PendingPhoto[]>>(buildInitialPendingPhotos());
  const pendingPhotosRef = useRef(pendingPhotos);

  const groupedItems = useMemo(
    () => groupItemsByCategory(context?.standardItems || []),
    [context],
  );

  useEffect(() => {
    pendingPhotosRef.current = pendingPhotos;
  }, [pendingPhotos]);

  const clearPendingPhotos = useCallback(() => {
    revokePendingPhotos(pendingPhotosRef.current);
    const emptyState = buildInitialPendingPhotos();
    pendingPhotosRef.current = emptyState;
    setPendingPhotos(emptyState);
  }, []);

  const loadApartmentOptions = useCallback(async () => {
    setLoadingApartments(true);
    const result = await supplyControlApi.getSupplyApartments();
    setAvailableApartments(result.data || []);
    setLoadingApartments(false);
  }, []);

  const loadReportingContext = useCallback(async (params: SupplyReportingContextParams) => {
    setLoading(true);
    setError(null);
    setSubmitError(null);
    setSuccessResult(null);

    const result = await supplyControlApi.getSupplyReportingContext(params);
    if (!result.data) {
      setContext(null);
      setItemStates({});
      setError(result.error || "לא ניתן לטעון את תקן האספקה לדירה");
      if (params.apartmentId || params.reportToken) {
        void loadApartmentOptions();
      }
      setLoading(false);
      return;
    }

    setContext(result.data);
    setSelectedApartmentId(result.data.apartment.apartment_id);
    setItemStates(buildInitialItemStates(result.data.standardItems));
    clearPendingPhotos();
    setSubmittedReportId(null);
    setIsEditingSubmittedReport(false);
    setLoading(false);
  }, [clearPendingPhotos, loadApartmentOptions]);

  useEffect(() => {
    const hasIdentifier = Boolean(apartmentId || reportToken);
    if (hasIdentifier) {
      void loadReportingContext({ apartmentId, reportToken });
      return;
    }

    setLoading(false);
    void loadApartmentOptions();
  }, [apartmentId, loadApartmentOptions, loadReportingContext, reportToken]);

  useEffect(() => {
    return () => {
      revokePendingPhotos(pendingPhotosRef.current);
    };
  }, []);

  function updateItemState(standardItemId: string, nextState: Partial<ReportItemFormState>) {
    setItemStates((current) => ({
      ...current,
      [standardItemId]: {
        ...(current[standardItemId] || {
          reported_status: "ok",
          actual_value: "",
          item_notes: "",
        }),
        ...nextState,
      },
    }));
  }

  async function handleApartmentSelectionSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedApartmentId) {
      setError("יש לבחור דירה כדי לפתוח את טופס הדיווח");
      return;
    }

    await loadReportingContext({ apartmentId: selectedApartmentId });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);

    const normalizedInitials = reporterInitials.trim();
    if (!normalizedInitials) {
      setSubmitError("יש למלא ראשי תיבות מדווח");
      return;
    }

    if (!context) {
      setSubmitError("לא נטען הקשר דיווח תקין");
      return;
    }

    const missingActualValueItem = context.standardItems.find((item) => {
      const state = itemStates[item.standard_item_id];
      return state?.reported_status === "partial" && !state.actual_value.trim();
    });

    if (missingActualValueItem) {
      setSubmitError(`יש למלא "מה נמצא בפועל?" עבור ${missingActualValueItem.item_name}`);
      return;
    }

    const payload: SupplyCreateReportInput = {
      apartment_id: context.apartment.apartment_id,
      reporter_initials: normalizedInitials,
      general_notes: generalNotes.trim(),
      items: context.standardItems.map((item) => {
        const state = itemStates[item.standard_item_id] || {
          reported_status: "ok" as const,
          actual_value: "",
          item_notes: "",
        };

        return {
          standard_item_id: item.standard_item_id,
          item_name: item.item_name,
          required_value: item.required_value,
          reported_status: state.reported_status,
          actual_value: state.actual_value.trim(),
          item_notes: state.item_notes.trim(),
        };
      }),
    };

    setSubmitting(true);

    try {
      const result = submittedReportId
        ? await supplyControlApi.updateSupplyReport({
            ...(payload as SupplyUpdateReportInput),
            report_id: submittedReportId,
          })
        : await supplyControlApi.createSupplyReport(payload);
      if (!result.data) {
        setSubmitError(result.error || (submittedReportId ? "עדכון הדיווח נכשל" : "שליחת הדיווח נכשלה"));
        setSubmitting(false);
        return;
      }

      const uploadedPhotoPayload = await buildPhotoUploadPayload(pendingPhotosRef.current);
      if (uploadedPhotoPayload.length > 0) {
        const photosResult = await supplyControlApi.uploadSupplyReportPhotos({
          report_id: result.data.report.report_id,
          apartment_id: context.apartment.apartment_id,
          photos: uploadedPhotoPayload,
        });

        if (!photosResult.data) {
          setSubmittedReportId(result.data.report.report_id);
          setIsEditingSubmittedReport(true);
          setSubmitError(`הדיווח נשמר אך העלאת התמונות נכשלה: ${photosResult.error || "שגיאה לא ידועה"}`);
          setSubmitting(false);
          return;
        }
      }

      setSubmittedReportId(result.data.report.report_id);
      setIsEditingSubmittedReport(false);
      setSuccessResult(result.data);
      clearPendingPhotos();
      setSubmitting(false);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "שליחת הדיווח נכשלה");
      setSubmitting(false);
    }
  }

  function handleEditSubmittedReport() {
    setSuccessResult(null);
    setSubmitError(null);
    setIsEditingSubmittedReport(true);
  }

  function handlePhotoSelection(category: SupplyPhotoCategory, files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    setSubmitError(null);

    const nextPhotos: PendingPhoto[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        setSubmitError(`הקובץ ${file.name} אינו קובץ תמונה נתמך`);
        return;
      }
      if (file.size > MAX_PHOTO_SIZE_BYTES) {
        setSubmitError(`הקובץ ${file.name} גדול מדי. גודל מקסימלי: 8MB`);
        return;
      }

      nextPhotos.push({
        id: `${category}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        category,
        notes: "",
      });
    }

    setPendingPhotos((current) => ({
      ...current,
      [category]: [...current[category], ...nextPhotos],
    }));
  }

  function removePendingPhoto(category: SupplyPhotoCategory, photoId: string) {
    setPendingPhotos((current) => {
      const photo = current[category].find((item) => item.id === photoId);
      if (photo) {
        URL.revokeObjectURL(photo.previewUrl);
      }

      return {
        ...current,
        [category]: current[category].filter((item) => item.id !== photoId),
      };
    });
  }

  if (loading) {
    return (
      <div className="mx-auto flex min-h-[60vh] w-full max-w-4xl items-center justify-center" dir="rtl">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="animate-spin" size={28} />
          <span className="text-sm">טוען טופס דיווח...</span>
        </div>
      </div>
    );
  }

  if (successResult && context) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6" dir="rtl">
        <Card className="border-primary/20 shadow-card">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <CheckCircle2 className="text-primary" size={36} />
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">הדיווח נשמר בהצלחה</h1>
              <p className="text-sm text-muted-foreground">
                הדיווח עבור הדירה נשמר במערכת.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleEditSubmittedReport}
                className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
              >
                ערוך דיווח
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!context) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6" dir="rtl">
        <Card className="shadow-card">
          <CardHeader className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ClipboardCheck size={16} />
              <span>דיווח שטח</span>
            </div>
            <CardTitle className="text-2xl">דיווח מילוי אספקה</CardTitle>
            <p className="text-sm leading-6 text-muted-foreground">
              יש לפתוח קישור דיווח ייעודי לדירה, או לבחור דירה מהרשימה אם הגעת למסך ללא מזהה.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-status-danger-text">
                {error}
              </div>
            )}
            <form className="space-y-4" onSubmit={handleApartmentSelectionSubmit}>
              <label className="flex flex-col gap-2 text-sm">
                <span className="font-medium">בחירת דירה</span>
                <select
                  value={selectedApartmentId}
                  onChange={(event) => setSelectedApartmentId(event.target.value)}
                  className="h-11 rounded-md border border-input bg-background px-3 text-right"
                >
                  <option value="">בחר דירה</option>
                  {availableApartments.map((apartment) => (
                    <option key={apartment.apartment_id} value={apartment.apartment_id}>
                      {apartment.location} · {apartment.mission}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                disabled={loadingApartments}
                className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingApartments ? "טוען..." : "פתח טופס דיווח"}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6" dir="rtl">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <ClipboardCheck size={16} />
          <span>דיווח שטח</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground">דיווח מילוי אספקה</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          בדיקה מהירה של תקן האספקה הקבוע בדירה ודיווח על חוסרים או חריגות.
        </p>
      </div>

      <ApartmentIdentity apartment={context.apartment} />

      <form className="space-y-6" onSubmit={handleSubmit}>
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">
              {isEditingSubmittedReport ? "עריכת דיווח שנשלח" : "פרטי דיווח"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">ראשי תיבות מדווח</span>
              <input
                value={reporterInitials}
                onChange={(event) => setReporterInitials(event.target.value)}
                className="h-11 rounded-md border border-input bg-background px-3 text-right"
                placeholder="לדוגמה: מ.ש"
              />
            </label>
          </CardContent>
        </Card>

        {groupedItems.map(([category, items]) => (
          <Card key={category} className="shadow-card">
            <CardHeader>
              <CardTitle className="text-lg">{category}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((item) => {
                const state = itemStates[item.standard_item_id] || {
                  reported_status: "ok" as const,
                  actual_value: "",
                  item_notes: "",
                };

                return (
                  <div key={item.standard_item_id} className="rounded-xl border border-border p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="font-semibold text-foreground">{item.item_name}</div>
                        <div className="text-sm text-muted-foreground">
                          נדרש: {formatRequiredValue(item)} · סוג דרישה: {REQUIRED_TYPE_LABELS[item.required_type]}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {STATUS_OPTIONS.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            aria-pressed={state.reported_status === option.value}
                            onClick={() => updateItemState(item.standard_item_id, { reported_status: option.value })}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-sm transition-colors",
                              state.reported_status === option.value
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background text-muted-foreground hover:bg-muted/50",
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {state.reported_status === "partial" && (
                      <label className="mt-4 flex flex-col gap-2 text-sm">
                        <span className="font-medium">מה נמצא בפועל?</span>
                        <input
                          value={state.actual_value}
                          onChange={(event) =>
                            updateItemState(item.standard_item_id, { actual_value: event.target.value })
                          }
                          className="h-11 rounded-md border border-input bg-background px-3 text-right"
                          placeholder="לדוגמה: 2 מתוך 4"
                        />
                      </label>
                    )}

                    {(state.reported_status === "missing" || state.reported_status === "partial") && (
                      <label className="mt-4 flex flex-col gap-2 text-sm">
                        <span className="font-medium">הערה לפריט</span>
                        <textarea
                          value={state.item_notes}
                          onChange={(event) =>
                            updateItemState(item.standard_item_id, { item_notes: event.target.value })
                          }
                          className="min-h-24 rounded-md border border-input bg-background px-3 py-2 text-right"
                          placeholder="תיאור קצר של החוסר או הבעיה"
                        />
                      </label>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">תמונות מהדיווח</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-lg border border-dashed border-border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              ניתן לצרף תמונות להוכחת מילוי האספקה
            </div>

            {PHOTO_CATEGORIES.map((category) => (
              <div key={category} className="space-y-3 rounded-xl border border-border p-4">
                <div className="flex items-center gap-2">
                  <ImagePlus size={16} className="text-muted-foreground" />
                  <div className="font-medium text-foreground">{category}</div>
                </div>

                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/10 px-4 py-6 text-center text-sm text-muted-foreground transition-colors hover:bg-muted/20">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(event) => {
                      handlePhotoSelection(category, event.target.files);
                      event.currentTarget.value = "";
                    }}
                  />
                  <span>בחר תמונות או צלם מהטלפון</span>
                  <span className="text-xs">אפשר לצרף כמה תמונות לכל קטגוריה</span>
                </label>

                {pendingPhotos[category].length === 0 ? (
                  <div className="text-sm text-muted-foreground">לא נבחרו תמונות לקטגוריה זו</div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {pendingPhotos[category].map((photo) => (
                      <div key={photo.id} className="overflow-hidden rounded-lg border border-border bg-card">
                        <img
                          src={photo.previewUrl}
                          alt={`${category} ${photo.file.name}`}
                          className="h-36 w-full object-cover"
                        />
                        <div className="flex items-center justify-between gap-3 px-3 py-2">
                          <div className="min-w-0 text-xs text-muted-foreground">
                            <div className="truncate">{photo.file.name}</div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removePendingPhoto(category, photo.id)}
                            className="inline-flex items-center gap-1 rounded-md border border-destructive/30 px-2.5 py-1.5 text-xs text-status-danger-text hover:bg-destructive/5"
                          >
                            <Trash2 size={12} />
                            הסר
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-lg">הערות כלליות</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex flex-col gap-2 text-sm">
              <span className="font-medium">הערות / תקלות שנצפו בדירה</span>
              <textarea
                value={generalNotes}
                onChange={(event) => setGeneralNotes(event.target.value)}
                className="min-h-28 rounded-md border border-input bg-background px-3 py-2 text-right"
                placeholder="למשל: תמי 4 לא תקין, נדרשת החלפה"
              />
            </label>

            {submitError && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-status-danger-text">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (submittedReportId ? "מעדכן..." : "שולח...") : submittedReportId ? "עדכן דיווח" : "שלח דיווח"}
            </button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
};
