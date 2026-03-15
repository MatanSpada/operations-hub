/**
 * src/components/shared/DataTable.tsx
 * =====================================
 * Reusable data table with sticky header and hover rows.
 * Used by all module tables.
 */

import React from "react";
import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  className?: string;
  minWidthClassName?: string;
}

export function DataTable<T>({
  columns,
  data,
  emptyMessage = "אין נתונים להצגה",
  rowKey,
  onRowClick,
  className,
  minWidthClassName = "min-w-[42rem]",
}: DataTableProps<T>) {
  return (
    <div className={cn("overflow-hidden rounded-lg bg-card shadow-card", className)}>
      <div className="overflow-x-auto">
        <table className={cn("w-full text-sm", minWidthClassName)} dir="rtl">
          <thead>
            <tr className="bg-muted border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    "whitespace-nowrap px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:px-4",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-12 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b border-border last:border-0 transition-colors duration-150",
                    onRowClick && "cursor-pointer hover:bg-muted/50"
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-3 py-3 text-right align-middle sm:px-4",
                        col.className
                      )}
                    >
                      {col.render
                        ? col.render(row)
                        : String((row as Record<string, unknown>)[col.key] ?? "—")}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
