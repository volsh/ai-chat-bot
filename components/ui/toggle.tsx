// components/ui/toggle.tsx
import React, { ReactNode } from "react";
import { Tooltip } from "react-tooltip";

interface ToggleProps {
  label?: string | React.ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  tooltip?: string | ReactNode;
  tooltipId?: string;
}

export default function Toggle({ label, checked, onChange, tooltip, tooltipId }: ToggleProps) {
  return (
    <label className="mt-1 flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-200">
      <input
        type="checkbox"
        className="toggle toggle-primary"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      {tooltip ? (
        <div className="flex items-center gap-2">
          {label}
          <span
            data-tooltip-id={tooltipId}
            data-tooltip-place="top"
            className="cursor-help text-xs text-zinc-500"
          >
            ⓘ
          </span>
          <Tooltip id={tooltipId} className="z-[9999] !opacity-100" style={{ zIndex: 9999 }}>
            <div className="max-w-xs text-left text-sm leading-snug">{tooltip}</div>
          </Tooltip>
        </div>
      ) : (
        label
      )}
    </label>
  );
}
