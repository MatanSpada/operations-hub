/**
 * src/pages/Index.tsx
 * ====================
 * Main app shell — loads data, manages active tab, renders layout.
 *
 * ADD NEW TAB HERE:
 * 1. Import the new page component
 * 2. Add a case to the renderTab() switch
 */

import React, { useState, useCallback, useEffect } from "react";
import { TabId, InitialData } from "@/types";
import { fetchInitialData } from "@/api";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopHeader } from "@/components/layout/TopHeader";
import { DashboardPage } from "@/modules/dashboard/DashboardPage";
import { FoodPage } from "@/modules/food/FoodPage";
import { EquipmentPage } from "@/modules/equipment/EquipmentPage";
import { MissionsPage } from "@/modules/missions/MissionsPage";
import { VehiclesPage } from "@/modules/vehicles/VehiclesPage";
import { WorkforcePage } from "@/modules/workforce/WorkforcePage";
import { QualificationsPage } from "@/modules/qualifications/QualificationsPage";
import { SettingsPage } from "@/modules/settings/SettingsPage";
import { useIsMobile } from "@/hooks/use-mobile";

export default function Index() {
  const [activeTab, setActiveTab] = useState<TabId>("dashboard");
  const [data, setData] = useState<InitialData | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "loading" | "synced" | "error">("idle");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  const load = useCallback(async () => {
    setSyncStatus("loading");
    const result = await fetchInitialData();
    if (result) {
      setData(result);
      setSyncStatus("synced");
    } else {
      setSyncStatus("error");
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [activeTab, isMobile]);

  useEffect(() => {
    if (!isMobile || !mobileSidebarOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, mobileSidebarOpen]);

  // ADD NEW TAB CASE HERE ↓
  const renderTab = () => {
    if (!data) return null;
    switch (activeTab) {
      case "dashboard":     return <DashboardPage data={data} />;
      case "food":          return <FoodPage data={data} onRefresh={load} />;
      case "equipment":     return <EquipmentPage data={data} onRefresh={load} />;
      case "missions":      return <MissionsPage data={data} onRefresh={load} />;
      case "vehicles":      return <VehiclesPage data={data} onRefresh={load} />;
      case "workforce":     return <WorkforcePage data={data} onRefresh={load} />;
      case "qualifications":return <QualificationsPage data={data} />;
      case "settings":      return <SettingsPage data={data} onRefresh={load} />;
      default:              return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-background" dir="rtl">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        syncStatus={syncStatus}
        isMobile={isMobile}
        isOpen={mobileSidebarOpen}
        onOpenChange={setMobileSidebarOpen}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader
          activeTab={activeTab}
          onRefresh={load}
          isLoading={syncStatus === "loading"}
          showMenuButton={isMobile}
          onMenuClick={() => setMobileSidebarOpen((open) => !open)}
        />
        <main className="flex-1 overflow-x-hidden px-4 py-4 sm:px-5 sm:py-5 lg:px-8 lg:py-6">
          {syncStatus === "loading" && !data && (
            <div className="flex items-center justify-center h-64">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">טוען נתונים...</span>
              </div>
            </div>
          )}
          {syncStatus === "error" && !data && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center text-muted-foreground">
                <p className="font-semibold text-status-danger-text">שגיאה בטעינת נתונים</p>
                <p className="text-sm mt-1">בדוק את כתובת ה-Apps Script ב-config.ts</p>
                <button onClick={load} className="mt-3 text-sm text-primary hover:underline">נסה שוב</button>
              </div>
            </div>
          )}
          {data && renderTab()}
        </main>
      </div>
    </div>
  );
}
