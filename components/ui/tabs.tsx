"use client";

import clsx from "clsx";

interface Tab {
  label: string;
  value: string;
}

interface TabsProps {
  tabs: Tab[];
  active?: string;
  className?: string;
  onChange: (tab: string) => void;
}

export default function Tabs({ tabs, active, onChange, className }: TabsProps) {
  return (
    <div className={clsx("w-full", className)}>
      <div className="mb-4 flex border-b">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onChange(tab.value)}
            className={clsx(
              "border-b-2 px-4 py-2 text-sm font-medium",
              active === tab.value
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-zinc-500 hover:text-zinc-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
