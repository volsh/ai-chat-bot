"use client";

import { useEffect, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import toast from "react-hot-toast";
import Card from "@/components/ui/card";
import Button from "@/components/ui/button";
import StatusBadge from "@/components/fineTuning/FineTuningStatusBadge";
import { FineTuneEvent } from "@/types";
import RetryModal from "@/components/RetryModal";
import Spinner from "@/components/ui/spinner";

function RetryJobCard({
  event,
  onRetryClick,
  locked,
  lockedUntil,
}: {
  event: FineTuneEvent;
  onRetryClick: (jobId: string) => void;
  locked: boolean;
  lockedUntil?: string;
}) {
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!locked || !lockedUntil) return;

    const updateCountdown = () => {
      const remainingMs = new Date(lockedUntil).getTime() - Date.now();
      if (remainingMs <= 0) {
        setCountdown("Available");
        return;
      }
      const mins = Math.floor(remainingMs / 60000);
      const secs = Math.floor((remainingMs % 60000) / 1000);
      setCountdown(`${mins}m ${secs}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [locked, lockedUntil]);

  const isMaxedOut = (event.retry_count || 0) >= 3;

  return (
    <Card key={event.job_id}>
      <div className="flex flex-col gap-2">
        <p>
          <strong>Job ID:</strong>{" "}
          <span
            title="Click to copy"
            className="cursor-pointer hover:underline"
            onClick={() => {
              navigator.clipboard.writeText(event.job_id);
              toast.success("Copied Job ID");
            }}
          >
            {event.job_id}
          </span>
        </p>
        <p>
          <strong>Reason:</strong> {event.error || event.message}
        </p>
        <p>
          <strong>Retries:</strong> {event.retry_count || 0} / 3
        </p>
        {event.snapshot_id && (
          <p className="text-xs text-zinc-400">
            Snapshot: <code>{event.snapshot_id.slice(0, 8)}...</code>
          </p>
        )}
        <p className="text-sm text-zinc-500">{new Date(event.created_at).toLocaleString()}</p>
        <StatusBadge
          status={event.status || event.fine_tune_snapshots?.job_status || "unknown"}
          tooltip
        />
        {locked && (
          <div className="rounded bg-orange-100 p-2 text-sm text-orange-700">
            🔒 Retry locked — {countdown}
          </div>
        )}
        <Button onClick={() => onRetryClick(event.job_id)} disabled={isMaxedOut || locked}>
          Retry Job
        </Button>
      </div>
    </Card>
  );
}

const EVENTS_PER_PAGE = 10;

export default function RetryFailedJobsPage() {
  const [events, setEvents] = useState<FineTuneEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [retryReason, setRetryReason] = useState<string>("");
  const [showModal, setShowModal] = useState(false);
  const [logs, setLogs] = useState<any[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [lockedMap, setLockedMap] = useState<Record<string, string>>({});
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadEvents();
  }, [currentPage]);

  const loadEvents = async () => {
    const [{ data: eventsData, error: eventsError, count }, { data: locksData }] =
      await Promise.all([
        supabase
          .from("fine_tune_events")
          .select(
            "job_id, user_id, status, created_at, message, retry_count, retry_reason, retry_origin, error, id, snapshot_id, fine_tune_snapshots(job_status)"
          )
          .eq("status", "failed")
          .order("created_at", { ascending: false })
          .range((currentPage - 1) * EVENTS_PER_PAGE, currentPage * EVENTS_PER_PAGE - 1),
        supabase.from("fine_tune_locks").select("snapshot_id, locked_until"),
      ]);

    if (eventsError) toast.error("Failed to load failed jobs");
    setEvents((eventsData as FineTuneEvent[]) || []);
    setTotalPages(Math.ceil((count ?? EVENTS_PER_PAGE) / EVENTS_PER_PAGE)); // Calculate total pages
    const map: Record<string, string> = {};
    (locksData || []).forEach((lock) => {
      map[lock.snapshot_id] = lock.locked_until;
    });
    setLockedMap(map);
    setLoading(false);
  };

  const loadRetryLogs = async (jobId: string) => {
    const { data, error } = await supabase
      .from("fine_tune_events")
      .select("created_at, message, retry_reason, retry_origin, error")
      .eq("job_id", jobId)
      .in("status", ["retrying", "retry_failed"])
      .order("created_at", { ascending: false });

    return error ? [] : data;
  };

  const handleRetry = async (jobId: string) => {
    setSelectedJob(jobId);
    setRetryReason("");
    setRetryCount(events.find((e) => e.job_id === jobId)?.retry_count || 0);
    setLogs(await loadRetryLogs(jobId));
    setShowModal(true);
    const selectedEvent = events.find((e) => e.job_id === jobId);
    setRetryCount(selectedEvent?.retry_count || 0);
    setSelectedSnapshotId(selectedEvent?.snapshot_id!);
  };

  const confirmRetry = async () => {
    if (!selectedJob) return;
    try {
      const res = await fetch("/api/exports/retry-failed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: selectedJob,
          retry_reason: retryReason,
          retry_origin: "manual",
          snapshot_id: selectedSnapshotId,
        }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Retry failed");
      toast.success("Retry launched successfully");
      await loadEvents();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setShowModal(false);
      setSelectedJob(null);
      setRetryReason("");
      setLogs([]);
    }
  };

  const overrideLock = async (snapshotId: string) => {
    const { error } = await supabase.from("fine_tune_locks").delete().eq("snapshot_id", snapshotId);
    if (error) {
      toast.error("Failed to override lock");
    } else {
      toast.success("Lock removed");
      await loadEvents(); // reload data
    }
  };

  return (
    <div className="mt-8">
      <h2 className="mb-2 text-lg font-semibold">🔁 Retry Failed Jobs</h2>

      {loading ? (
        <Spinner />
      ) : events.length === 0 ? (
        <p>No failed jobs found.</p>
      ) : (
        <div className="grid gap-4">
          {events.map((event: FineTuneEvent) => (
            <RetryJobCard
              key={event.job_id}
              event={event}
              onRetryClick={handleRetry}
              locked={
                event.snapshot_id in lockedMap &&
                new Date(lockedMap[event.snapshot_id]) > new Date(Date.now())
              }
              lockedUntil={lockedMap[event.snapshot_id]}
            />
          ))}
        </div>
      )}

      {/* Pagination Controls */}
      <div className="mt-4 flex justify-between">
        <button
          onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="rounded bg-gray-200 px-4 py-2 text-gray-700 disabled:opacity-50"
        >
          Previous
        </button>
        <span className="self-center text-sm text-gray-600">
          Page {currentPage} of {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="rounded bg-gray-200 px-4 py-2 text-gray-700 disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {showModal && (
        <RetryModal
          jobId={selectedJob!}
          retryReason={retryReason}
          onChange={setRetryReason}
          onConfirm={confirmRetry}
          onClose={() => setShowModal(false)}
          logs={logs}
          retryCount={retryCount}
          locked={
            !!selectedSnapshotId &&
            selectedSnapshotId in lockedMap &&
            new Date(lockedMap[selectedSnapshotId]) > new Date(Date.now())
          }
          lockedUntil={!!selectedSnapshotId ? lockedMap[selectedSnapshotId] : undefined}
          onOverrideLock={() => overrideLock(selectedSnapshotId!)}
        />
      )}
    </div>
  );
}
