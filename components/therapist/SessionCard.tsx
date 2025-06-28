import { useState } from "react";
import { CheckSquare, Square } from "lucide-react";
import { MessageWithEmotion, FlaggedSession } from "@/types";
import SeverityBar from "@/components/ui/SeverityBar";
import { SeverityBadge } from "../SeverityBadge";
import { Pencil } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Tooltip } from "react-tooltip";
import SessionSummaryPanel from "./SessionSummaryPanel";
import AnnotationDiff from "./AnnotationDiff";
import { calculateSessionScore } from "@/utils/chat/calculateSessionScore";

interface Props {
  session: FlaggedSession;
  selected: boolean;
  onToggle: () => void;
  filterFlags?: (f: MessageWithEmotion) => boolean;
  flagsPerPage?: number;
  onAnnotate?: (msg: MessageWithEmotion) => void;
}

export default function SessionCard({
  session,
  selected,
  onToggle,
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
  const [showFlagsSection, setShowFlagsSection] = useState(true);

  const filteredFlags = flagged_messages.filter(filterFlags);
  const visibleFlags = filteredFlags.slice(0, visibleCount);

  const session_score = calculateSessionScore(session.flagged_messages).finalScore;

  return (
    <div
      className="rounded border p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
      data-tooltip-id={`summary-${session.session_id}`}
      data-tooltip-content={`Top Emotions: ${session?.top_emotions?.join(", ")}\nTop Reasons: ${session?.top_reasons?.join(", ")}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <button onClick={onToggle}>
            {selected ? <CheckSquare className="text-blue-600" size={18} /> : <Square size={18} />}
          </button>
          <div className="text-lg font-semibold">
            <a href={`/chat/${session.session_id}`}>{session_title || "Untitled session"}</a>
          </div>
        </div>
        <div
          className="ml-auto cursor-help text-xs text-purple-600 underline decoration-dotted"
          data-tooltip-id={`score-${session.session_id}`}
        >
          🧠 Score: {session_score.toFixed(2)}
          <Tooltip
            id={`score-${session.session_id}`}
            place="top"
            className="z-50 max-w-xs rounded bg-zinc-900 px-2 py-1 text-xs text-white"
          >
            Session Score is a weighted average of:
            <ul className="mt-1 list-disc pl-4">
              <li>
                <strong>Goal Alignment</strong>: AI-estimated alignment with treatment goal (0–1),
                correctable by therapist
              </li>
              <li>
                <strong>Emotional Tone Balance</strong>: net intensity of positive vs. negative
                emotions
              </li>
            </ul>
            Final Score = 50% alignment score + 50% tone balance.
          </Tooltip>
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
      <>
        <div className="mt-3">
          <button
            onClick={() => setShowFlagsSection((prev) => !prev)}
            className="text-xs text-blue-600 underline"
          >
            {showFlagsSection ? "Hide Messages" : "Show Messages"}
          </button>
        </div>

        <div
          className={`mt-2 space-y-2 text-sm transition-opacity duration-300 ease-in-out ${
            showFlagsSection ? "opacity-100" : "hidden opacity-0"
          }`}
        >
          {visibleFlags.map((flag) => (
            <div key={flag.source_id} className="rounded border bg-white/10 p-2 dark:bg-zinc-900">
              <div className="flex items-center gap-1 text-zinc-700 dark:text-zinc-200">
                <div className="prose prose-sm dark:prose-invert">
                  <ReactMarkdown>{flag.content}</ReactMarkdown>
                </div>
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
                {flag.intensity && flag.tone && (
                  <div className="mt-1">
                    <SeverityBadge intensity={flag.intensity} tone={flag.tone} />
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
      </>
    </div>
  );
}
