import React, { useId } from "react";
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
  const displayValue = value
    ? (shortYear ? formatDateShort(value) : formatDate(value))
    : emptyLabel;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <div className="flex h-10 items-center rounded-md border border-border bg-background px-3 pl-10 text-sm text-foreground">
          {displayValue}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
          <CalendarDays size={15} />
        </div>
        <input
          id={inputId}
          type="date"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          aria-label={label}
        />
      </div>
    </div>
  );
};
