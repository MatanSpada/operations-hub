import React, { useState } from "react";
import { Building2, ClipboardList, LayoutDashboard, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ApartmentSupplySection = "dashboard" | "reports" | "settings";

const SECTION_LABELS: Record<ApartmentSupplySection, string> = {
  dashboard: "דשבורד",
  reports: "דיווחים",
  settings: "הגדרות",
};

const SECTION_PLACEHOLDERS: Record<ApartmentSupplySection, string> = {
  dashboard: "דשבורד בקרת אספקה",
  reports: "דיווחים לפי דירה",
  settings: "הגדרות דירות ומלאי קבוע",
};

const SECTION_ICONS: Record<ApartmentSupplySection, React.ReactNode> = {
  dashboard: <LayoutDashboard size={16} />,
  reports: <ClipboardList size={16} />,
  settings: <Settings2 size={16} />,
};

export const ApartmentSupplyControlPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState<ApartmentSupplySection>("dashboard");

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        title="בקרת אספקת דירות"
        subtitle="שלד מודול ראשוני לדשבורד, דיווחים והגדרות. הלוגיקה העסקית והטפסים יתווספו בשלבים הבאים."
      />

      <Card className="shadow-card">
        <CardHeader className="gap-4">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Building2 size={16} />
            <span>מודול חדש</span>
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

            {(Object.keys(SECTION_PLACEHOLDERS) as ApartmentSupplySection[]).map((section) => (
              <TabsContent key={section} value={section} className="mt-6">
                <Card className="border-dashed shadow-none">
                  <CardContent className="flex min-h-40 items-center justify-center p-6 sm:min-h-48">
                    <div className="text-center">
                      <CardTitle className="text-lg">{SECTION_PLACEHOLDERS[section]}</CardTitle>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        </CardHeader>
      </Card>
    </div>
  );
};
