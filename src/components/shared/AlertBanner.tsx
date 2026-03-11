/**
 * src/components/shared/AlertBanner.tsx
 * =======================================
 * Alert banner for dashboard warnings and system alerts.
 */

import React from "react";
import { cn } from "@/lib/utils";
import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";

type AlertType = "warning" | "danger" | "success" | "info";

const styles: Record<AlertType, string> = {
  warning: "bg-status-warning-bg text-status-warning-text border-status-warning-bg",
  danger: "bg-status-danger-bg text-status-danger-text border-status-danger-bg",
  success: "bg-status-success-bg text-status-success-text border-status-success-bg",
  info: "bg-status-info-bg text-status-info-text border-status-info-bg",
};

const icons: Record<AlertType, React.ReactNode> = {
  warning: <AlertTriangle size={16} />,
  danger: <XCircle size={16} />,
  success: <CheckCircle size={16} />,
  info: <Info size={16} />,
};

interface AlertBannerProps {
  type: AlertType;
  title: string;
  message?: string;
  className?: string;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  type,
  title,
  message,
  className,
}) => (
  <div
    className={cn(
      "flex items-start gap-3 rounded-lg border px-4 py-3",
      styles[type],
      className
    )}
  >
    <span className="mt-0.5 shrink-0">{icons[type]}</span>
    <div>
      <p className="font-semibold text-sm">{title}</p>
      {message && <p className="text-xs mt-0.5 opacity-80">{message}</p>}
    </div>
  </div>
);
