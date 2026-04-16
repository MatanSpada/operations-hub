import React from "react";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: string;
  pageSizeOptions: Array<{
    value: string;
    label: string;
  }>;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: string) => void;
  itemLabel: string;
}

function getVisiblePages(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 3) {
    return [1, 2, 3, 4, totalPages];
  }

  if (currentPage >= totalPages - 2) {
    return [1, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, currentPage - 1, currentPage, currentPage + 1, totalPages];
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  itemLabel,
}) => {
  const pageSizeId = React.useId();
  const visiblePages = getVisiblePages(currentPage, totalPages);

  return (
    <div className="flex flex-col gap-3 rounded-b-lg border border-t-0 border-border bg-card px-4 py-3 shadow-card sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <label htmlFor={pageSizeId} className="text-sm text-muted-foreground">
            שורות בעמוד
          </label>
          <select
            id={pageSizeId}
            value={pageSize}
            onChange={(event) => onPageSizeChange(event.target.value)}
            className="h-9 rounded-md border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            dir="rtl"
          >
            {pageSizeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <span className="text-sm text-muted-foreground">
          {totalItems} {itemLabel}
        </span>
      </div>

      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className="rounded-md border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            הקודם
          </button>

          <div className="flex items-center gap-1">
            {visiblePages.map((page, index) => {
              const showEllipsis =
                index > 0 && visiblePages[index - 1] !== page - 1;

              return (
                <React.Fragment key={page}>
                  {showEllipsis && (
                    <span className="px-2 text-sm text-muted-foreground">…</span>
                  )}
                  <button
                    type="button"
                    onClick={() => onPageChange(page)}
                    className={`min-w-9 rounded-md border px-3 py-2 text-sm transition-colors ${
                      page === currentPage
                        ? "border-primary bg-primary/5 font-semibold text-primary"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {page}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="rounded-md border border-border px-3 py-2 text-sm text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
          >
            הבא
          </button>
        </div>

        <span className="text-sm text-muted-foreground">
          עמוד {currentPage} מתוך {totalPages}
        </span>
      </div>
    </div>
  );
};
