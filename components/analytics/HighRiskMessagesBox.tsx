import React, { useState } from "react";
import { EmotionTrainingRow } from "@/types";
import { format } from "date-fns";
import Link from "next/link";

export default function HighRiskMessagesBox({
  rows,
  pageSize = 5,
}: {
  rows: EmotionTrainingRow[];
  pageSize?: number;
}) {
  const highRisk = rows.filter((r) => r.tone === "negative" && r.intensity > 0.8);
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(highRisk.length / pageSize);
  const currentRows = highRisk.slice(page * pageSize, (page + 1) * pageSize);

  if (!highRisk.length) {
    return (
      <div className="mt-8 rounded border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
        <h3 className="font-bold text-gray-900 dark:text-gray-100">High Risk Messages</h3>
        <div className="text-gray-500">No high risk messages found.</div>
      </div>
    );
  }

  return (
    <div className="mt-8 space-y-3 rounded border border-gray-200 bg-white p-4 text-sm dark:border-gray-700 dark:bg-gray-800">
      <h3 className="font-bold text-gray-900 dark:text-gray-100">High Risk Messages</h3>
      <div className="text-gray-600 dark:text-gray-300">
        Total high risk: <span className="font-bold">{highRisk.length}</span>
      </div>

      {currentRows.map((msg) => (
        <div key={msg.source_id} className="flex flex-col rounded bg-gray-50 p-2 dark:bg-gray-700">
          <div className="font-medium text-gray-900 dark:text-gray-100">{msg.content}</div>
          <div className="mt-1 flex justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{format(new Date(msg.message_created_at), "PP p")}</span>
            {msg.source_id && (
              <Link
                href={`/chat/${msg.session_id}?messageId=${msg.source_id}`}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                View Session
              </Link>
            )}
            <span>
              {`Emotion: ${msg.emotion}, Intensity: ${msg.intensity}`}
            </span>
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
