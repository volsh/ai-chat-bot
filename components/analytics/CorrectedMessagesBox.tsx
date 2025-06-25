import React, { useState } from "react";
import { EmotionTrainingRow } from "@/types";
import { format } from "date-fns";
import Link from "next/link";

export default function CorrectedMessagesBox({
  rows,
  pageSize = 5,
}: {
  rows: EmotionTrainingRow[];
  pageSize?: number;
}) {
  const corrected = rows.filter(
    (r) =>
      (r.original_emotion && r.original_emotion !== r.emotion) ||
      (r.original_intensity && Number(r.original_intensity) !== Number(r.intensity)) ||
      (r.original_tone && r.original_tone !== r.tone) ||
      (r.original_topic && r.original_topic !== r.topic)
  );
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(corrected.length / pageSize);
  const currentRows = corrected.slice(page * pageSize, (page + 1) * pageSize);

  if (!corrected.length) {
    return (
      <div className="mt-8 rounded border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="font-bold text-gray-900 dark:text-gray-100">Corrected Messages</h3>
        <div className="text-gray-500">No corrections found.</div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-3 rounded border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="font-bold text-gray-900 dark:text-gray-100">Corrected Messages</h3>
      <div className="text-gray-600 dark:text-gray-300">
        Total corrections: <span className="font-bold">{corrected.length}</span>
      </div>

      {currentRows.map((msg) => (
        <div key={msg.source_id} className="flex flex-col rounded bg-gray-50 p-2 dark:bg-gray-700">
          <div className="font-medium text-gray-900 dark:text-gray-100">{msg.content}</div>

          <div className="mt-1 space-y-1 text-xs text-gray-500 dark:text-gray-400">
            <div>Original vs Corrected:</div>
            <div>
              Emotion: {msg.original_emotion} ➔ {msg.emotion}
            </div>
            <div>
              Intensity: {msg.original_intensity} ➔ {msg.intensity}
            </div>
            <div>
              Tone: {msg.original_tone} ➔ {msg.tone}
            </div>
            <div>
              Topic: {msg.original_topic ?? "N/A"} ➔ {msg.topic ?? "N/A"}
            </div>
            <div className="mt-1 flex justify-between">
              <span>{format(new Date(msg.tagged_at), "PP p")}</span>
              {msg.session_id && (
                <Link
                  href={`/chat/${msg.session_id}?messageId=${msg.source_id}`}
                  className="text-blue-600 hover:underline dark:text-blue-400"
                >
                  View Session
                </Link>
              )}
            </div>
          </div>
        </div>
      ))}

      {totalPages > 1 && (
        <div className="mt-2 flex items-center justify-end gap-2 text-xs">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 0))}
            disabled={page === 0}
            className="rounded border px-2 py-1 disabled:opacity-50"
          >
            Prev
          </button>
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
            disabled={page >= totalPages - 1}
            className="rounded border px-2 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
