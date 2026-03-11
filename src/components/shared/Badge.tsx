/**
 * src/components/ui/Badge.tsx
 * ===========================
 * Status badge component. Used throughout the app for status indicators.
 *
 * TO ADD A NEW BADGE COLOR:
 * 1. Add the status colors in src/index.css
 * 2. Add the variant key here in variantClasses
 * 3. Use <Badge variant="myVariant">label</Badge>
 */

import React from "react";
import { BadgeVariant } from "@/types";
import { cn } from "@/lib/utils";

// ADD NEW BADGE VARIANTS HERE ↓
const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-status-success-bg text-status-success-text",
  warning: "bg-status-warning-bg text-status-warning-text",
  danger: "bg-status-danger-bg text-status-danger-text",
  info: "bg-status-info-bg text-status-info-text",
  neutral: "bg-status-neutral-bg text-status-neutral-text",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "neutral",
  children,
  className,
}) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
      variantClasses[variant],
      className
    )}
  >
    {children}
  </span>
);
