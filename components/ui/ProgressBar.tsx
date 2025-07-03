// components/ui/ProgressBar.tsx

import clsx from "clsx";

interface ProgressBarProps {
  status: string; // "pending", "running", "succeeded", "failed"
  retryCount?: number;
}

const statusMap: Record<string, { color: string; label: string; value: number }> = {
  // Common OpenAI fine-tune statuses
  pending: { color: "bg-yellow-400", label: "Queued", value: 20 },
  uploading: { color: "bg-yellow-400", label: "Uploading", value: 25 },
  validating_files: { color: "bg-blue-400", label: "Validating Files", value: 35 },
  running: { color: "bg-blue-500", label: "Training", value: 60 },
  succeeded: { color: "bg-green-500", label: "Completed", value: 100 },
  failed: { color: "bg-red-500", label: "Failed", value: 100 },

  // Internal system/edge function statuses
  retry_failed: { color: "bg-red-600", label: "Retry Failed", value: 100 },
  cancelled: { color: "bg-gray-400", label: "Cancelled", value: 100 },
  timeout: { color: "bg-red-400", label: "Timeout", value: 100 },

  // Optional: custom internal states
  scheduled: { color: "bg-indigo-400", label: "Scheduled", value: 30 },
  exporting: { color: "bg-cyan-500", label: "Preparing Export", value: 10 },
  locked: { color: "bg-orange-500", label: "Locked", value: 5 },
};

export default function ProgressBar({ status, retryCount = 0 }: ProgressBarProps) {
  const progress = statusMap[status] ?? statusMap["pending"];

  return (
    <div className="mt-2 w-full">
      <div className="mb-1 flex justify-between text-xs text-gray-500">
        <span>{progress.label}</span>
        {retryCount > 0 && <span>Retry: {retryCount}</span>}
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-zinc-200 dark:bg-zinc-700">
        <div
          className={clsx("h-full transition-all duration-700 ease-in-out", progress.color)}
          style={{ width: `${progress.value}%` }}
        />
      </div>
    </div>
  );
}
