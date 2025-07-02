import { Tooltip } from "react-tooltip";
import { AlertTriangle, AlertCircle, ShieldCheck, Flame } from "lucide-react";

export default function SeverityBar({
  high,
  medium,
  low,
  tooltipId,
  showLabels = true,
}: {
  high: number;
  medium: number;
  low: number;
  tooltipId: string;
  showLabels?: boolean;
}) {
  const total = high + medium + low;
  const percent = (v: number) => (total ? Math.round((v / total) * 100) : 0);
  const parts = [
    {
      key: "high",
      label: "High",
      icon: <AlertTriangle size={12} className="text-red-600" />,
      color: "#ef4444",
      value: high,
      width: percent(high),
    },
    {
      key: "medium",
      label: "Medium",
      icon: <AlertCircle size={12} className="text-yellow-500" />,
      color: "#f59e0b",
      value: medium,
      width: percent(medium),
    },
    {
      key: "low",
      label: "Low",
      icon: <ShieldCheck size={12} className="text-emerald-500" />,
      color: "#10b981",
      value: low,
      width: percent(low),
    },
  ];

  return (
    <div className="mt-3 mb-3 space-y-1">
      {/* Severity Label with Icon */}
      <div className="flex items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
        <Flame size={14} className="text-red-500" />
        Severity
      </div>

      {showLabels && (
        <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
          {parts.map(
            (p) =>
              p.value > 0 && (
                <div key={p.key} className="flex items-center gap-1">
                  {p.icon}
                  {p.label}: {p.value}
                </div>
              )
          )}
        </div>
      )}

      {/* Bar */}
      <div
        className="flex h-3 w-full overflow-hidden rounded"
        data-tooltip-id={tooltipId}
        data-tooltip-content={parts
          .filter((p) => p.value > 0)
          .map((p) => `${p.label}: ${p.value} (${p.width}%)`)
          .join(" | ")}
      >
        {parts.map(
          (part) =>
            part.width > 0 && (
              <div
                key={part.key}
                style={{ width: `${part.width}%`, backgroundColor: part.color }}
                className="transition-all"
              />
            )
        )}
      </div>
      <Tooltip id={tooltipId} />
    </div>
  );
}
