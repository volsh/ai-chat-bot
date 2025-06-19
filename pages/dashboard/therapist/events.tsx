// pages/dashboard/therapist/events.tsx
"use client";

import { useEffect, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import Card from "@/components/ui/card";
import { FineTuneEvent } from "@/types";
import clsx from "clsx";

export default function FineTuneEventLogPage() {
  const [events, setEvents] = useState<FineTuneEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase
        .from("fine_tune_events")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) return console.error(error);
      setEvents(data);
      setLoading(false);
    };

    fetchEvents();
  }, []);

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">🧠 Fine-Tune Event Logs</h1>
      <div className="mb-4 flex gap-4">
        <select
          className="rounded border p-1 text-sm"
          onChange={(e) => {
            const val = e.target.value;
            if (!val) return setEvents(events); // Reset filter
            setEvents(events.filter((ev) => ev.status === val));
          }}
        >
          <option value="">All Statuses</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
          <option value="retrying">Retrying</option>
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
                  <p>
                    <strong>Job:</strong>{" "}
                    <span
                      className="cursor-pointer text-blue-600 underline"
                      title="Click to copy"
                      onClick={() => navigator.clipboard.writeText(event.job_id)}
                    >
                      {event.job_id}
                    </span>
                  </p>
                </p>
                <p>
                  <strong>User:</strong> {event.user_id}
                </p>
                {event.model_version && (
                  <p>
                    <strong>Model:</strong> {event.model_version}
                  </p>
                )}
                {event.error_details && (
                  <p className="text-red-500">
                    <strong>Error:</strong> {event.error_details}
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
    </div>
  );
}
