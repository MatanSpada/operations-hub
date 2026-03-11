/**
 * src/components/layout/TopHeader.tsx
 * =====================================
 * Top header bar showing current page title.
 */

import React from "react";
import { TAB_LABELS } from "@/config";
import { TabId } from "@/types";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopHeaderProps {
  activeTab: TabId;
  onRefresh: () => void;
  isLoading: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  onRefresh,
  isLoading,
}) => (
  <header className="h-14 bg-background border-b border-border flex items-center justify-between px-8 sticky top-0 z-10">
    <h2 className="text-base font-semibold text-foreground">
      {TAB_LABELS[activeTab]}
    </h2>
    <button
      onClick={onRefresh}
      title="רענן נתונים"
      className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-md hover:bg-muted"
    >
      <RefreshCw
        size={14}
        className={cn(isLoading && "animate-spin")}
      />
      רענן
    </button>
  </header>
);
