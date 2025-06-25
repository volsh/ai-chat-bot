import { useMemo } from "react";
import Modal from "@/components/ui/modal";
import Textarea from "@/components/ui/textarea";
import Button from "@/components/ui/button";
import StatusBadge from "@/components/StatusBadge";
import { FineTuneEvent } from "@/types";

interface RetryModalProps {
  jobId: string;
  onChange: (val: string) => void;
  onConfirm: () => void;
  onClose: () => void;
  logs: FineTuneEvent[];
  retryReason: string;
  retryCount: number;
  autoRetry?: boolean;
  retryOrigin?: "webhook" | "manual" | "scheduled";
  locked?: boolean;
  lockedUntil?: string;
  onOverrideLock?: () => void;
}

export default function RetryModal({
  jobId,
  retryReason,
  onChange,
  onConfirm,
  onClose,
  logs,
  retryCount,
  autoRetry = false,
  retryOrigin = "manual",
  locked,
  lockedUntil,
  onOverrideLock,
}: RetryModalProps) {
  const maxRetries = 3;
  const tooManyRetries = retryCount >= maxRetries;

  const retryLogs = useMemo(
    () =>
      logs
        ?.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .map((log: FineTuneEvent) => ({
          time: new Date(log.created_at).toLocaleString(),
          retry_reason: log.retry_reason || "-",
          retry_origin: log.retry_origin || "unknown",
          status: log.status,
        })),
    [logs]
  );

  return (
    <Modal onClose={onClose}>
      <h2 className="mb-2 text-lg font-semibold">Retry Snapshot</h2>

      {autoRetry && (
        <div className="mb-2 rounded bg-yellow-100 p-2 text-sm text-yellow-800">
          This was triggered automatically after a failure.
        </div>
      )}

      <div className="mb-2 text-sm">
        <strong>Retry Origin:</strong>
        <span className="italic text-zinc-500">
          {retryOrigin === "webhook" && "🔁 Auto"}
          {retryOrigin === "manual" && "👤 Manual"}
          {retryOrigin === "scheduled" && "⏰ Scheduled"}
        </span>
      </div>

      <label className="mb-1 block text-sm font-medium text-zinc-700">Retry Reason</label>
      <Textarea
        placeholder="Optional reason for retry"
        defaultValue={retryReason}
        onBlur={(e) => onChange(e.target.value)}
        className="mb-4"
        disabled={autoRetry}
      />
      <div className="mb-2 space-x-2">
        <Button
          variant="ghost"
          onClick={() => onChange("OpenAI API timeout")}
          title="Likely caused by latency or unavailability"
        >
          OpenAI Timeout
        </Button>
        <Button
          variant="ghost"
          onClick={() => onChange("Supabase sync error")}
          title="Session or annotation mismatch"
        >
          Supabase Sync Error
        </Button>
      </div>

      <div className="mb-4">
        <strong>Retry Attempts:</strong> {retryCount} / {maxRetries}
        {tooManyRetries && <span className="ml-2 text-sm text-red-600">(Max retries reached)</span>}
        <ul className="mt-2 space-y-2 text-sm text-zinc-600">
          {retryLogs?.map((log, i) => (
            <li key={i} className="flex items-start gap-2">
              <StatusBadge status={log.status} tooltip />
              <div className="flex flex-col">
                <span>
                  <span className="font-medium capitalize">{log.status}</span> — {log.retry_reason}{" "}
                  <span className="italic text-zinc-500">({log.retry_origin})</span>
                </span>
                <span className="text-xs text-zinc-400">{log.time}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
      {locked && (
        <div className="mb-4 rounded bg-orange-100 p-2 text-sm text-orange-700">
          🔒 <strong>Retry locked</strong> until{" "}
          <strong>{new Date(lockedUntil!).toLocaleTimeString()}</strong>.
          <br />
          <Button variant="outline" onClick={onOverrideLock} className="mt-2">
            🔓 Override Lock
          </Button>
        </div>
      )}

      <div className="flex gap-2">
        <Button onClick={onConfirm} disabled={tooManyRetries || autoRetry}>
          Confirm Retry
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </Modal>
  );
}
