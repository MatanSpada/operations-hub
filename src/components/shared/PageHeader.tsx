/**
 * src/components/shared/PageHeader.tsx
 * ======================================
 * Page-level header with title and optional action button.
 */

import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, action }) => (
  <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
    <div className="min-w-0">
      <h2 className="text-lg font-bold text-foreground sm:text-xl">{title}</h2>
      {subtitle && <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{subtitle}</p>}
    </div>
    {action && <div className="w-full sm:w-auto sm:shrink-0">{action}</div>}
  </div>
);
