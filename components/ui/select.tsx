// components/ui/Select.tsx
import React from "react";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { label: string; value: string }[];
}

const Select: React.FC<SelectProps> = ({ label, options, ...props }) => (
  <div className="flex flex-col space-y-1">
    {label && (
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-200">{label}</label>
    )}
    <select
      {...props}
      className="transform rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 shadow-sm outline-none transition-all duration-200 ease-in-out hover:scale-[1.01] hover:shadow-md focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-100"
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

export default Select;
