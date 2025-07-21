// components/StatusBadge.tsx

import { Tooltip } from "react-tooltip";

export type Status =
  | "succeeded"
  | "failed"
  | "retrying"
  | "pending"
  | "running"
  | "queued"
  | "cancelled"
  | "expired";

export function getStatusBadgeEmoji(status: string): string {
  switch (status) {
    case "succeeded":
      return "✅";
    case "failed":
      return "❌";
    case "retrying":
      return "🔁";
    case "pending":
      return "⏳";
    case "running":
      return "🏃‍♂️";
    case "queued":
      return "🕒";
    case "cancelled":
      return "🚫";
    case "expired":
      return "⌛";
    default:
      return "❔";
  }
}

export function getStatusDotColor(status: string): string {
  switch (status) {
    case "succeeded":
      return "bg-green-500";
    case "failed":
      return "bg-red-500";
    case "retrying":
      return "bg-yellow-400";
    case "pending":
      return "bg-gray-400";
    case "running":
      return "bg-blue-500";
    case "queued":
      return "bg-gray-400";
    case "cancelled":
      return "bg-red-800";
    case "expired":
      return "bg-gray-500";
    default:
      return "bg-gray-300";
  }
}

export default function StatusBadge({
  status,
  tooltip = false,
}: {
  status: string;
  tooltip?: boolean;
}) {
  const dot = getStatusDotColor(status);
  const emoji = getStatusBadgeEmoji(status);
  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <>
      <span
        data-tooltip-id={`status-${status}`}
        data-tooltip-content={`${label} status`}
        className="inline-flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300"
        title={tooltip ? label : undefined}
      >
        <span className={`h-2 w-2 rounded-full ${dot}`} />
        {emoji} {label}
      </span>
      {tooltip && <Tooltip id={`status-${status}`} />}
    </>
  );
}
