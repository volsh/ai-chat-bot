import { useState } from "react";
import { CheckSquare, Square } from "lucide-react";
import { MessageWithEmotion, FlaggedSession } from "@/types";
import SeverityBar from "@/components/ui/SeverityBar";
import { SeverityBadge } from "../SeverityBadge";
import { Pencil } from "lucide-react";
import ReactMarkdown from "react-markdown";
import SessionSummaryPanel from "./SessionSummaryPanel";
import AnnotationDiff from "./AnnotationDiff";

interface Props {
  session: FlaggedSession;
  selected: boolean;
  onToggle: () => void;
  showFlags?: boolean;
  filterFlags?: (f: MessageWithEmotion) => boolean;
  flagsPerPage?: number;
  onAnnotate?: (msg: MessageWithEmotion) => void;
}

export default function SessionCard({
  session,
  selected,
  onToggle,
  showFlags,
  filterFlags = () => true,
  flagsPerPage = 3,
  onAnnotate,
}: Props) {
  const {
    session_id,
    session_title,
    client_email,
    severity_counts,
    flagged_messages = [],
  } = session;

  const [visibleCount, setVisibleCount] = useState(flagsPerPage);
  const [showSummary, setShowSummary] = useState(false);
  const filteredFlags = flagged_messages.filter(filterFlags);
  const visibleFlags = filteredFlags.slice(0, visibleCount);

  return (
    <div
      className="rounded border p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
      data-tooltip-id={`summary-${session.session_id}`}
      data-tooltip-content={`Top Emotions: ${session?.top_emotions?.join(", ")}\nTop Reasons: ${session?.top_reasons?.join(", ")}`}
    >
      <div className="flex items-center gap-2">
        <button onClick={onToggle}>
          {selected ? <CheckSquare className="text-blue-600" size={18} /> : <Square size={18} />}
        </button>
        <div className="text-lg font-semibold text-zinc-800 dark:text-white">
          {session_title || "Untitled session"}
        </div>
      </div>
      <div className="text-xs text-zinc-500">Client: {client_email}</div>
      <SeverityBar
        high={severity_counts.high}
        medium={severity_counts.medium}
        low={severity_counts.low}
        tooltipId={`severity-${session_id}`}
      />
      <div className="mb-1 text-xs text-zinc-400">
        {session.reviewed ? "✅ Reviewed" : "🕒 Not Reviewed"}
      </div>
      {session.ai_agreement_rate !== undefined && (
        <div title="Agreement between AI and therapist" className="text-xs text-zinc-500">
          🤝 AI Agreement: {session.ai_agreement_rate}%
        </div>
      )}
      <div className="mt-3">
        <button
          onClick={() => setShowSummary((prev) => !prev)}
          className="text-xs text-blue-600 underline"
        >
          {showSummary ? "Hide Summary" : "Show Summary"}
        </button>
      </div>

      {showSummary && (
        <SessionSummaryPanel
          sessionId={session.session_id}
          initialSummary={session.summary || ""}
          messages={session.flagged_messages}
        />
      )}
      {showFlags && (
        <div className="mt-4 space-y-2 text-sm">
          {visibleFlags.map((flag) => (
            <div key={flag.source_id} className="rounded border bg-white/10 p-2 dark:bg-zinc-900">
              <div className="flex items-center gap-1 text-zinc-700 dark:text-zinc-200">
                <div className="prose prose-sm dark:prose-invert">
                  <ReactMarkdown>{flag.content}</ReactMarkdown>
                </div>{" "}
                {!!flag.flag_reason && (
                  <span className="ml-1 text-red-500" title={`Flagged: ${flag.flag_reason}`}>
                    🚩
                  </span>
                )}
                {onAnnotate && (
                  <button
                    onClick={() => onAnnotate(flag)}
                    className="ml-1 text-blue-400 hover:text-blue-600"
                    title="Annotate message"
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </div>
              <div className="text-xs text-zinc-500">
                <AnnotationDiff emotion={flag} />
                {flag.severity && (
                  <div className="mt-1">
                    <SeverityBadge severity={flag.severity} />
                  </div>
                )}
                {flag.flag_reason && (
                  <div className="mt-1">
                    <span className="font-semibold">Flag reason:</span> {flag.flag_reason}
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredFlags.length > visibleFlags.length && (
            <div className="text-center">
              <button
                onClick={() => setVisibleCount((c) => c + flagsPerPage)}
                className="text-xs text-blue-500 underline"
              >
                Load more messages
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
