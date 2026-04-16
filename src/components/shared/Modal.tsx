/**
 * src/components/shared/Modal.tsx
 * ================================
 * Simple modal dialog for forms (add/edit/confirm actions).
 */

import React from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  width?: string;
}

export const Modal: React.FC<ModalProps> = ({
  open,
  onClose,
  title,
  children,
  width = "max-w-lg",
}) => {
  if (!open) return null;
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-4"
      dir="rtl"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Panel */}
      <div
        className={cn(
          "relative max-h-[min(90vh,52rem)] w-full overflow-hidden rounded-t-2xl bg-card shadow-lg animate-scale-in sm:rounded-xl",
          width
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-4 sm:px-6">
          <h3 className="min-w-0 text-base font-semibold text-foreground">{title}</h3>
          <button
            onClick={onClose}
            className="shrink-0 rounded-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>
        {/* Body */}
        <div className="max-h-[calc(90vh-4.5rem)] overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">{children}</div>
      </div>
    </div>,
    document.body
  );
};
