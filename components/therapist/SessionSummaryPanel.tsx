"use client";

import { useState } from "react";
import { summarizeSession } from "@/utils/chat/summarizeSession";
import { saveSummaryToDb } from "@/utils/chat/saveSummaryToDb";
import { toast } from "react-hot-toast";
import { MessageWithEmotion } from "@/types";

interface SessionSummaryPanelProps {
  sessionId: string;
  initialSummary: string | null;
  messages: MessageWithEmotion[];
}

export default function SessionSummaryPanel({
  sessionId,
  initialSummary,
  messages,
}: SessionSummaryPanelProps) {
  const [summary, setSummary] = useState(initialSummary || "");
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");

  const handleRegenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await summarizeSession(messages.map((m) => ({ ...m, role: m.message_role! })));
      setSummary(result || "");
    } catch (err: any) {
      setError(err.message || "Failed to regenerate summary.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError("");
    try {
      await saveSummaryToDb(sessionId, summary);
      toast.success("Summary saved");
      setEditing(false);
    } catch (err: any) {
      setError(err.message || "Failed to save summary.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 rounded border bg-zinc-100 p-3 text-sm dark:bg-zinc-800 dark:text-white">
      <div className="mb-2 flex items-center justify-between">
        <strong className="text-sm">🧠 AI Summary</strong>
        <div className="flex gap-2">
          <button
            onClick={handleRegenerate}
            disabled={loading}
            className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "Regenerating…" : "↻ Regenerate"}
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !summary.trim()}
            className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
          >
            💾 Save
          </button>
        </div>
      </div>

      {!editing ? (
        <>
          <p>{summary || "No summary available."}</p>
          <button className="mt-2 text-xs text-blue-600 underline" onClick={() => setEditing(true)}>
            Edit
          </button>
        </>
      ) : (
        <>
          <textarea
            className="w-full rounded border p-2 text-sm"
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
          <button
            className="mt-2 text-xs text-blue-600 underline"
            onClick={() => setEditing(false)}
          >
            Cancel
          </button>
        </>
      )}
      {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
    </div>
  );
}
