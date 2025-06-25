"use client";

import { useEffect, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import Card from "@/components/ui/card";
import { FineTuneEvent } from "@/types";
import clsx from "clsx";
import toast from "react-hot-toast";

const EVENTS_PER_PAGE = 10; // You can adjust this as needed

export default function FineTuneEventLogPage() {
  const [events, setEvents] = useState<FineTuneEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchEvents = async () => {
      let query = supabase
        .from("fine_tune_events")
        .select("*")
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * EVENTS_PER_PAGE, currentPage * EVENTS_PER_PAGE - 1);

      // Apply status filter if it's not an empty string
      if (status) {
        query = query.eq("status", status);
      }

      const { data: eventData, error: fetchError } = await query;

      if (fetchError) {
        console.error(fetchError);
        return;
      }

      const { count, error: countError } = await supabase
        .from("fine_tune_events")
        .select("id", { count: "exact" });

      if (countError) {
        console.error(countError);
        return;
      }

      setEvents(eventData || []);
      setTotalPages(Math.ceil((count ?? EVENTS_PER_PAGE) / EVENTS_PER_PAGE));
      setLoading(false);
    };

    fetchEvents();
  }, [currentPage, status]);

  return (
    <div className="mt-8">
      <h2 className="mb-2 text-lg font-semibold">🔔 Fine-Tune Event Logs</h2>
      <div className="mb-4 flex gap-4">
        <select className="rounded border p-1 text-sm" onChange={(e) => setStatus(e.target.value)}>
          <option value="">All Statuses</option>
          <option value="succeeded">Success</option>
          <option value="failed">Failed</option>
          <option value="running">Running</option>
          <option value="validating_files">Validating Files</option>
          {/* <option value="retrying">Retrying</option> */}
        </select>
      </div>

      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="grid gap-4">
          {events.map((event) => (
            <Card key={event.id}>
              <div className="p-4">
                <p>
                  <strong
                    className={clsx("text-xs", {
                      "font-semibold text-red-600": event.status === "failed",
                      "text-green-600": event.status === "succeeded",
                      "text-zinc-500": event.status === "pending",
                    })}
                  >
                    Status:
                  </strong>{" "}
                  {event.status}
                </p>
                <p>
                  <strong>Job:</strong>{" "}
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
                  <strong>User:</strong> {event.user_id}
                </p>
                {event.model_version && (
                  <p>
                    <strong>Model:</strong> {event.model_version}
                  </p>
                )}
                {event.error && (
                  <p className="text-red-500">
                    <strong>Error:</strong> {event.error}
                  </p>
                )}
                <p className="text-sm text-zinc-500">
                  {new Date(event.created_at).toLocaleString()}
                </p>
              </div>
            </Card>
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
    </div>
  );
}
