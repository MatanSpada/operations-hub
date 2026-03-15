/**
 * src/components/layout/TopHeader.tsx
 * =====================================
 * Top header bar showing current page title.
 */

import React from "react";
import { TAB_LABELS } from "@/config";
import { TabId } from "@/types";
import { Menu, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface TopHeaderProps {
  activeTab: TabId;
  onRefresh: () => void;
  isLoading: boolean;
  showMenuButton?: boolean;
  onMenuClick?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeTab,
  onRefresh,
  isLoading,
  showMenuButton = false,
  onMenuClick,
}) => (
  <header className="sticky top-0 z-30 flex min-h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur sm:px-5 lg:px-8">
    <div className="flex min-w-0 items-center gap-2 sm:gap-3">
      {showMenuButton && (
        <button
          type="button"
          onClick={onMenuClick}
          title="פתח תפריט"
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-border bg-card text-foreground transition-colors hover:bg-muted md:hidden"
          aria-label="פתח תפריט ניווט"
        >
          <Menu size={18} />
        </button>
      )}
      <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">
        {TAB_LABELS[activeTab]}
      </h2>
    </div>
    <button
      type="button"
      onClick={onRefresh}
      title="רענן נתונים"
      className="inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:text-sm"
    >
      <RefreshCw
        size={14}
        className={cn(isLoading && "animate-spin")}
      />
      <span className="hidden sm:inline">רענן נתונים</span>
      <span className="sm:hidden">רענן</span>
    </button>
  </header>
);
