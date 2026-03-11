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

import React from "react";
import {
  LayoutDashboard,
  ShoppingBasket,
  Zap,
  Truck,
  Users,
  Award,
  Settings,
} from "lucide-react";
import { TabId } from "@/types";
import { APP_META } from "@/config";
import { cn } from "@/lib/utils";

// ADD NEW TAB NAVIGATION ITEM HERE ↓
const NAV_ITEMS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "לוח בקרה", icon: <LayoutDashboard size={18} /> },
  { id: "food", label: "מזון ודירות", icon: <ShoppingBasket size={18} /> },
  { id: "equipment", label: "ציוד חשמלי", icon: <Zap size={18} /> },
  { id: "vehicles", label: "רכבים", icon: <Truck size={18} /> },
  { id: "workforce", label: "כוח אדם ומילואים", icon: <Users size={18} /> },
  { id: "qualifications", label: "הכשרות", icon: <Award size={18} /> },
  { id: "settings", label: "הגדרות", icon: <Settings size={18} /> },
];

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  syncStatus: "idle" | "loading" | "synced" | "error";
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  syncStatus,
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

  return (
    <aside
      className="w-60 shrink-0 bg-sidebar border-l border-sidebar-border flex flex-col h-screen sticky top-0 shadow-sm"
      dir="rtl"
    >
      {/* Brand */}
      <div className="px-5 py-5 border-b border-sidebar-border">
        <h1 className="text-base font-bold text-foreground leading-tight">
          {APP_META.name}
        </h1>
        <span className={cn("text-xs mt-1 block", syncColor)}>{syncLabel}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        <div className="flex flex-col gap-0.5">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex items-center gap-3 w-full text-right px-3 py-2.5 rounded-md text-sm transition-all duration-150 ease-spring",
                activeTab === item.id
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <span className="shrink-0">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-sidebar-border">
        <p className="text-xs text-muted-foreground">
          גרסה {APP_META.version}
        </p>
      </div>
    </aside>
  );
};
