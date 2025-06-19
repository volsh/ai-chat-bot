// components/ui/TherapistMultiSelect.tsx
"use client";

import { UserProfile } from "@/types";
import { useState } from "react";
import { X } from "lucide-react";

interface Props {
  therapists: UserProfile[];
  selected: string[];
  onToggle: (id: string) => void;
}

export default function TherapistMultiSelect({ therapists, selected, onToggle }: Props) {
  const [filter, setFilter] = useState("");

  const filtered = therapists.filter((t) =>
    `${t.full_name ?? ""} ${t.email}`.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="Search therapists..."
        className="w-full rounded border p-1 text-sm dark:bg-zinc-800 dark:text-white"
      />
      <div className="max-h-48 space-y-1 overflow-y-auto">
        {filtered.map((t) => (
          <div
            key={t.id}
            className="flex items-center justify-between rounded border p-2 text-sm dark:border-zinc-700"
          >
            <div>
              <p className="font-medium">{t.full_name || t.email}</p>
              <p className="text-xs text-zinc-500">{t.email}</p>
            </div>
            <button
              onClick={() => onToggle(t.id)}
              className={`rounded px-3 py-1 ${
                selected.includes(t.id) ? "bg-green-600 text-white" : "bg-blue-600 text-white"
              }`}
            >
              {selected.includes(t.id) ? "Remove" : "Share"}
            </button>
          </div>
        ))}
      </div>
      {selected.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selected.map((id) => {
            const t = therapists.find((t) => t.id === id);
            return (
              <span
                key={id}
                className="flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-800 dark:bg-blue-800 dark:text-white"
              >
                {t?.full_name || t?.email}
                <button onClick={() => onToggle(id)}>
                  <X size={14} />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
