// pages/review/[sessionId].tsx
import { GetServerSidePropsContext, NextApiRequest, NextApiResponse } from "next";
import { createSupabaseServerClient } from "@/libs/supabase";
import { Message } from "@/types";
import ReactMarkdown from "react-markdown";
import clsx from "clsx";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { summarizeSession } from "@/utils/chat/summarizeSession";
import { saveSummaryToDb } from "@/utils/chat/saveSummaryToDb";
import { toast } from "react-hot-toast";
import { useRouter } from "next/router";
import ssrGuard from "@/utils/auth/ssrGuard";
import { emotions } from "@/utils/emotions/constants";
import Select from "@/components/ui/select";
import Slider from "@/components/ui/slider";

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const redirect = await ssrGuard(context, ["therapist", "admin"]);
  if (redirect) {
    return redirect;
  }
  const supabase = createSupabaseServerClient(
    context.req as NextApiRequest,
    context.res as NextApiResponse
  );
  const sessionId = context.params?.sessionId;

  const { data: session } = await supabase
    .from("sessions")
    .select("id, summary")
    .eq("id", sessionId)
    .single();

  if (!session) return { notFound: true };

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  return {
    props: {
      sessionId,
      messages,
      summary: session.summary ?? null,
    },
  };
}

export default function ReviewSessionPage({
  sessionId,
  messages,
  summary: initialSummary,
}: {
  sessionId: string;
  messages: Message[];
  summary: string | null;
}) {
  const [summary, setSummary] = useState(initialSummary);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showEditor, setShowEditor] = useState(false);
  const [annotations, setAnnotations] = useState<Record<string, any>>({});
  const [allMessages, setAllMessages] = useState<Message[]>(messages);
  const [visibleMessages, setVisibleMessages] = useState<Message[]>(messages);
  const [saving, setSaving] = useState(false);
  const [showTopBtn, setShowTopBtn] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const onScroll = () => setShowTopBtn(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const regenerateSummary = async () => {
    setLoading(true);
    setError("");

    try {
      const title = await summarizeSession(messages);
      setSummary(title || "No summary generated.");
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const saveSummary = async () => {
    setLoading(true);
    try {
      await saveSummaryToDb(sessionId, summary!);
      toast.success("Summary manually updated.");
      router.replace(router.asPath);
    } catch (err: any) {
      setError(err.message || "Unexpected error");
    } finally {
      setLoading(false);
    }
  };

  const handleAnnotation = async (msgId: string, field: string, value: string | number) => {
    setAnnotations((prev) => ({
      ...prev,
      [msgId]: {
        ...prev[msgId],
        [field]: value,
      },
    }));
  };

  const saveAnnotations = async () => {
    setSaving(true);
    try {
      const entries = Object.entries(annotations);
      for (const [message_id, values] of entries) {
        const response = await fetch("/api/annotate-message", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ source_id: message_id, ...values }),
        });
        if (!response.ok) toast.error(`Failed to save annotation for message ${message_id}`);
      }
      toast.success("Annotations saved");
      setAnnotations({});
    } catch (e) {
      toast.error("Failed to save annotations");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-4">
      <h1 className="mb-4 text-2xl font-semibold">📄 Session Transcript Review</h1>

      <div className="rounded bg-zinc-100 p-4 text-sm text-gray-800">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-md font-semibold">AI Insight Summary</h2>
          <div className="flex gap-2">
            <button
              onClick={regenerateSummary}
              disabled={loading}
              className="rounded bg-blue-500 px-2 py-1 text-xs text-white hover:bg-blue-600 disabled:opacity-50"
            >
              {loading ? "Regenerating..." : "↻ Regenerate Summary"}
            </button>
            <button
              onClick={saveSummary}
              disabled={!summary?.trim()}
              className="rounded bg-green-600 px-2 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-40"
            >
              Save Edit
            </button>
          </div>
        </div>
        {summary ? (
          <>
            <p>{summary}</p>
            <button
              className="mt-2 text-xs text-blue-600 underline"
              onClick={() => setShowEditor((prev) => !prev)}
            >
              {showEditor ? "Hide Editor" : "Edit Summary"}
            </button>
            {showEditor && (
              <textarea
                className="mt-2 w-full rounded border p-2 text-sm"
                rows={3}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            )}
          </>
        ) : (
          <p className="text-xs text-gray-400">No summary available yet.</p>
        )}
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
      <div className="mb-4 flex gap-2">
        <input
          placeholder="Filter by role (user, assistant)..."
          className="mb-4 w-48 rounded border p-1 text-xs"
          onChange={(e) => {
            const val = e.target.value.trim().toLowerCase();
            setVisibleMessages(
              allMessages.filter((m) => !val || m.role.toLowerCase().includes(val))
            );
          }}
        />
      </div>
      <div className="mb-4 flex items-center justify-end text-sm text-blue-600 underline">
        <button
          onClick={() => {
            const details = document.querySelectorAll("details");
            details.forEach((d) => (d.open = !d.open));
          }}
        >
          Toggle Expand/Collapse All
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {visibleMessages.map((msg, i) => {
          const annotation = annotations[msg.id!] || {};
          return (
            <details
              key={msg.id}
              open
              className="rounded border px-3 py-2 text-sm shadow-sm dark:border-zinc-700"
            >
              <summary className="flex cursor-pointer items-center justify-between text-xs text-zinc-600 dark:text-zinc-400">
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      "rounded-full px-2 py-0.5 text-xs font-medium text-white",
                      msg.role === "user"
                        ? "bg-gray-500"
                        : msg.role === "assistant"
                          ? "bg-blue-600"
                          : "bg-zinc-500"
                    )}
                  >
                    {msg.role}
                  </span>
                  <span>{format(new Date(msg.created_at), "MMM d, p")}</span>
                </div>
                {annotation.emotion && (
                  <span className="rounded bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800">
                    {annotation.emotion}
                  </span>
                )}
              </summary>

              <div className="prose prose-sm mt-2 dark:prose-invert">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>

              <div className="mt-2 space-y-1">
                <Select
                  className="w-full rounded border p-1 text-xs"
                  value={annotation.emotion || ""}
                  onChange={(e) => handleAnnotation(msg.id!, "emotion", e.target.value)}
                  options={emotions.map((e) => ({ value: e, label: e }))}
                />

                <Slider
                  label="Corrected Intensity"
                  min={0}
                  max={1}
                  step={0.01}
                  value={annotation.intensity ?? 0.5}
                  onChange={(val) =>
                    handleAnnotation(msg.id!, "intensity", parseFloat(val.toFixed(2)))
                  }
                />

                <textarea
                  className="w-full rounded border p-1 text-xs"
                  placeholder="Notes"
                  rows={2}
                  value={annotation.notes || ""}
                  onChange={(e) => handleAnnotation(msg.id!, "notes", e.target.value)}
                />
              </div>
            </details>
          );
        })}
      </div>

      <div className="mt-6 text-right">
        <div className="sticky bottom-4 z-10 mt-6 flex justify-end">
          {Object.keys(annotations).length > 0 && (
            <span className="mr-4 self-center rounded bg-yellow-100 px-2 py-1 text-xs text-yellow-800 shadow">
              {Object.keys(annotations).length} unsaved{" "}
              {Object.keys(annotations).length > 1 ? "changes" : "change"}
            </span>
          )}

          <button
            onClick={saveAnnotations}
            disabled={saving}
            className="rounded bg-indigo-600 px-4 py-2 text-sm text-white shadow hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? "Saving..." : "💾 Save All Annotations"}
          </button>
        </div>
      </div>
      {showTopBtn && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 rounded-full bg-blue-600 px-4 py-2 text-sm text-white shadow hover:bg-blue-700"
        >
          ⬆ Back to Top
        </button>
      )}
    </div>
  );
}
