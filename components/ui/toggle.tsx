// components/ui/toggle.tsx
import React from "react";

interface ToggleProps {
  label: string | React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export default function Toggle({ label, checked, onChange }: ToggleProps) {
  return (
    <label className="mt-1 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
      <input
        type="checkbox"
        className="toggle toggle-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
    </label>
  );
}
