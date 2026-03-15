/**
 * src/components/shared/SearchInput.tsx
 * =======================================
 * RTL search/filter input field.
 */

import React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = "חיפוש...",
  className,
}) => (
  <div className={cn("relative w-full", className)}>
    <Search
      size={15}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
    />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-10 w-full rounded-md border border-border bg-card pl-3 pr-9 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring"
      dir="rtl"
    />
  </div>
);
