import React, { useId, useRef } from "react";
import { CalendarDays } from "lucide-react";
import { formatDate, formatDateShort } from "@/utils";

interface DateDisplayInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  emptyLabel?: string;
  shortYear?: boolean;
}

export const DateDisplayInput: React.FC<DateDisplayInputProps> = ({
  label,
  value,
  onChange,
  emptyLabel = "בחר תאריך",
  shortYear = false,
}) => {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const displayValue = value
    ? (shortYear ? formatDateShort(value) : formatDate(value))
    : emptyLabel;

  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;

    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }

    input.focus();
    input.click();
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <button
          type="button"
          onClick={openPicker}
          className="flex h-10 w-full items-center rounded-md border border-border bg-background px-3 pl-10 text-right text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {displayValue}
        </button>
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
          <CalendarDays size={15} />
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="pointer-events-none absolute inset-0 h-full w-full opacity-0"
          aria-label={label}
          tabIndex={-1}
        />
      </div>
    </div>
  );
};
