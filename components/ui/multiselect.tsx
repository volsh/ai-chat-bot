// components/ui/MultiSelect.tsx
"use client";

import Select from "react-select";

export type MultiSelectOption = { label: string; value: string };

export default function MultiSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
  isClearable = true,
}: {
  label: string;
  options: MultiSelectOption[];
  value: MultiSelectOption[];
  onChange: (value: MultiSelectOption[]) => void;
  placeholder?: string;
  isClearable?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm text-zinc-500">{label}</label>
      <Select
        isMulti
        options={options}
        value={value}
        onChange={(newValue) =>
          onChange(Array.isArray(newValue) ? (newValue as MultiSelectOption[]) : [])
        }
        placeholder={placeholder}
        classNamePrefix="react-select"
        isClearable={isClearable}
      />
    </div>
  );
}
