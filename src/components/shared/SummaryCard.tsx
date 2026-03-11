/**
 * src/components/shared/SummaryCard.tsx
 * ======================================
 * Dashboard summary metric card. Shows a label, big value, and optional sub-text.
 */

import React from "react";
import { cn } from "@/lib/utils";
import { BadgeVariant } from "@/types";

const accentMap: Record<BadgeVariant, string> = {
  success: "text-status-success-text",
  warning: "text-status-warning-text",
  danger: "text-status-danger-text",
  info: "text-status-info-text",
  neutral: "text-foreground",
};

interface SummaryCardProps {
  label: string;
  value: string | number;
  sub?: string;
  variant?: BadgeVariant;
  icon?: React.ReactNode;
  className?: string;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  sub,
  variant = "neutral",
  icon,
  className,
}) => (
  <div
    className={cn(
      "bg-card rounded-lg shadow-card hover:shadow-card-hover transition-shadow duration-250 p-5 flex flex-col gap-2",
      className
    )}
  >
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground font-medium">{label}</span>
      {icon && <span className="text-muted-foreground opacity-60">{icon}</span>}
    </div>
    <span className={cn("text-3xl font-bold tabular-nums leading-none", accentMap[variant])}>
      {value}
    </span>
    {sub && <span className="text-xs text-muted-foreground">{sub}</span>}
  </div>
);
