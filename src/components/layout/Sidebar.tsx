/**
 * src/components/layout/Sidebar.tsx
 * ===================================
 * Left sidebar with navigation tabs.
 *
 * ADD NEW TAB HERE:
 * 1. Add an entry to NAV_ITEMS below
 * 2. Add the TabId to src/types.ts
 * 3. Add the label to src/config.ts TAB_LABELS
 * 4. Add the route/case in src/App.tsx
 */

import React, { useEffect } from "react";
import {
  LayoutDashboard,
  ShoppingBasket,
  Zap,
  ClipboardList,
  Truck,
  Users,
  Award,
  Database,
  Building2,
  X,
} from "lucide-react";
import { TabId } from "@/types";
import { APP_META } from "@/config";
import { cn } from "@/lib/utils";

// ADD NEW TAB NAVIGATION ITEM HERE ↓
const NAV_ITEMS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "לוח בקרה", icon: <LayoutDashboard size={18} /> },
  { id: "food", label: "מזון ודירות", icon: <ShoppingBasket size={18} /> },
  { id: "equipment", label: "ציוד חשמלי", icon: <Zap size={18} /> },
  { id: "missions", label: "משימות", icon: <ClipboardList size={18} /> },
  { id: "vehicles", label: "רכבים", icon: <Truck size={18} /> },
  { id: "workforce", label: "כוח אדם ומילואים", icon: <Users size={18} /> },
  { id: "qualifications", label: "הכשרות", icon: <Award size={18} /> },
  { id: "settings", label: "ניהול נתונים", icon: <Database size={18} /> },
  { id: "apartmentSupplyControl", label: "בקרת אספקת דירות", icon: <Building2 size={18} /> },
];

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  syncStatus: "idle" | "loading" | "synced" | "error";
  isMobile: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  syncStatus,
  isMobile,
  isOpen,
  onOpenChange,
}) => {
  const syncLabel = {
    idle: "ממתין",
    loading: "מסנכרן...",
    synced: "מעודכן",
    error: "שגיאת סנכרון",
  }[syncStatus];

  const syncColor = {
    idle: "text-muted-foreground",
    loading: "text-status-info-text",
    synced: "text-status-success-text",
    error: "text-status-danger-text",
  }[syncStatus];

  useEffect(() => {
    if (!isMobile || !isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, isOpen, onOpenChange]);

  const sidebarContent = (
    <>
      <div className="flex items-start justify-between gap-3 border-b border-sidebar-border px-4 py-4 sm:px-5 sm:py-5">
        <div>
          <h1 className="text-base font-bold leading-tight text-foreground">
            {APP_META.name}
          </h1>
          <span className={cn("mt-1 block text-xs", syncColor)}>{syncLabel}</span>
        </div>
        {isMobile && (
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            aria-label="סגור תפריט"
          >
            <X size={18} />
          </button>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        <div className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-3 text-right text-sm transition-all duration-150 ease-spring sm:py-2.5",
                activeTab === item.id
                  ? "bg-primary font-semibold text-primary-foreground shadow-xs"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="border-t border-sidebar-border px-4 py-4 sm:px-5">
        <p className="text-xs text-muted-foreground">גרסה {APP_META.version}</p>
      </div>
    </>
  );

  return (
    <>
      <aside
        className="sticky top-0 hidden h-screen w-60 shrink-0 border-l border-sidebar-border bg-sidebar shadow-sm md:flex md:flex-col"
        dir="rtl"
      >
        {sidebarContent}
      </aside>

      {isMobile && (
        <div
          className={cn(
            "fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px] transition-opacity duration-200 md:hidden",
            isOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
          )}
          onClick={() => onOpenChange(false)}
          aria-hidden={!isOpen}
        >
          <aside
            className={cn(
              "absolute inset-y-0 right-0 flex w-[min(82vw,20rem)] max-w-full flex-col border-l border-sidebar-border bg-sidebar shadow-lg transition-transform duration-200 ease-out",
              isOpen ? "translate-x-0" : "translate-x-full"
            )}
            dir="rtl"
            onClick={(event) => event.stopPropagation()}
            aria-label="ניווט ראשי"
          >
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
