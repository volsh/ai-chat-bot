"use client";

import { useEffect, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { format } from "date-fns";
import { toast } from "react-hot-toast";
import StatusBadge from "../StatusBadge";
import { Tooltip } from "react-tooltip";

const SNAPSHOTS_PER_PAGE = 10;

export default function SnapshotList() {
  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const loadSnapshots = async () => {
      const { data, error, count } = await supabase
        .from("fine_tune_snapshots")
        .select("id, created_at, version, filters, job_status", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * SNAPSHOTS_PER_PAGE, currentPage * SNAPSHOTS_PER_PAGE - 1);

      if (error) {
        toast.error("Failed to load snapshots");
        return;
      }

      setSnapshots(data || []);
      setTotalPages(Math.ceil((count ?? SNAPSHOTS_PER_PAGE) / SNAPSHOTS_PER_PAGE)); // Calculate total pages
      setLoading(false);
    };

    loadSnapshots();

    const channel = supabase
      .channel("snapshots")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "fine_tune_snapshots",
        },
        (payload) => {
          setSnapshots((prev) => prev.map((s) => (s.id === payload.new.id ? payload.new : s)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentPage]); // Re-fetch when currentPage changes

  if (loading) return <p className="text-sm text-gray-400">Loading snapshots…</p>;

  if (snapshots.length === 0) return <p className="text-sm text-gray-500">No snapshots yet.</p>;

  return (
    <div className="mt-8">
      <h2 className="mb-2 text-lg font-semibold">🧠 Training Snapshots</h2>
      <ul className="space-y-3">
        {snapshots.map((s) => (
          <li
            key={s.id}
            className="rounded border bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800"
          >
            <div className="flex items-center justify-between text-sm">
              <StatusBadge status={s.job_status} />
              <span
                className="text-sm text-blue-600 dark:text-blue-400"
                data-tooltip-id={`version-${s.id}`}
                data-tooltip-content={`🧠 Fine-tune model version ${s.version}`}
              >
                🧠 Model v{s.version}
              </span>
              <Tooltip id={`version-${s.id}`} />
              <span className="text-xs text-zinc-500 dark:text-zinc-400">
                {format(new Date(s.created_at), "PPPp")}
              </span>
            </div>
            <div className="mt-2 break-words text-xs text-zinc-500">
              <div className="mt-2 break-words text-xs text-zinc-500">
                <strong>Filters:</strong>{" "}
                {Object.keys(s.filters || {}).length === 0 ? (
                  <span className="text-zinc-400">None</span>
                ) : (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs underline">View Filters</summary>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-100">
                      {Object.entries(s.filters || {}).map(([key, val]) => (
                        <span key={key} className="rounded bg-zinc-700 px-2 py-1">
                          {key}: {Array.isArray(val) ? val.join(", ") : val?.toString()}
                        </span>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

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
    </div>
  );
}
