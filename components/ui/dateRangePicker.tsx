// components/ui/DateRangePicker.tsx
import React from "react";
import { CalendarDays, X } from "lucide-react";

export type Range = { from: string; to: string };

interface DateRangePickerProps {
  value: Range;
  onChange: (range: Range) => void;
}

const inputBase =
  "rounded border px-2 py-y text-sm transition-all duration-200 ease-in-out shadow-sm " +
  "bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 " +
  "border-zinc-300 dark:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  const isInvalid = value.from && value.to && new Date(value.from) > new Date(value.to);

  return (
    <div className="min-w-[260px] space-y-1 text-sm">
      <label className="flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-200">
        <CalendarDays className="h-4 w-4 text-zinc-500 dark:text-zinc-200" />
        Select dates
        {(value.from || value.to) && (
          <button
            type="button"
            onClick={() => onChange({ from: "", to: "" })}
            className="ml-auto text-zinc-500 transition-all hover:text-red-500"
            title="Clear"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </label>

      <div className="flex items-center gap-2">
        <input
          type="date"
          value={value.from}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
          className={inputBase}
          max={value.to || undefined}
        />
        <span className="text-zinc-600 dark:text-zinc-300">to</span>
        <input
          type="date"
          value={value.to}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
          className={inputBase}
          min={value.from || undefined}
        />
      </div>

      {isInvalid && (
        <div className="mt-1 text-xs text-red-500">"From" date must be before "To" date.</div>
      )}
    </div>
  );
}
