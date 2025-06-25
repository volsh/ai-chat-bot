import { Message, MessageWithEmotion } from "@/types";
import copyToClipboard from "@/utils/general/copyToClipboard";
import clsx from "clsx";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { useAppStore } from "@/state";
import AnnotationModal from "../therapist/AnnotationModal";
import { SeverityBadge } from "../SeverityBadge";
import AnnotationDiff from "../therapist/AnnotationDiff";
import { getEmotionBadgeClass } from "@/utils/emotions/getEmotionBadgeClass";

export default function ChatMessage({
  msg,
  emotion,
  regenerate,
  loading = false,
  onRefresh,
}: {
  msg: MessageWithEmotion;
  emotion: MessageWithEmotion;
  regenerate: () => void;
  loading: boolean;
  onRefresh: () => void;
}) {
  const isInitiallyShort = msg.content.length < 600;
  const [isExpanded, setExpanded] = useState(isInitiallyShort);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const messageRef = useRef<HTMLDivElement>(null);

  const { userProfile } = useAppStore();
  const isTherapist = userProfile?.role === "therapist";

  useEffect(() => {
    if (messageRef.current) {
      messageRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [isExpanded]);

  useEffect(() => {
    if (
      isTherapist &&
      emotion &&
      (emotion.flagged ||
        emotion.emotion !== emotion.original_emotion ||
        emotion.tone !== emotion.original_tone ||
        emotion.topic !== emotion.original_topic ||
        emotion.intensity !== emotion.original_intensity)
    ) {
      setShowDetails(true);
    }
  }, [emotion, isTherapist]);

  return (
    <motion.div
      ref={messageRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
      className={clsx("group relative whitespace-pre-wrap rounded-lg px-3 py-2 text-sm", {
        "bg-zinc-100 text-black dark:bg-zinc-800": msg.role === "user",
        "bg-blue-100 text-blue-900 dark:bg-blue-800 dark:text-white": msg.role === "assistant",
        "bg-zinc-200 text-zinc-800 dark:bg-zinc-700": msg.role === "system",
      })}
    >
      <div className="flex justify-between gap-1 text-xs text-gray-500 dark:text-gray-100">
        <span className="font-medium capitalize">{msg.role}</span>
        <span className="flex flex-wrap items-center gap-2">
          {emotion && isTherapist && (
            <>
              {emotion.flagged && (
                <div
                  className="rounded bg-red-100 px-2 py-1 text-red-700"
                  title={emotion.flag_reason || "Flagged by therapist"}
                >
                  ⚠️ Flagged
                </div>
              )}
              {emotion.severity && <SeverityBadge severity={emotion.severity} />}
              <div
                className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs ${getEmotionBadgeClass(emotion.tone!, emotion.intensity!)}`}
                title={`Emotion: ${emotion.emotion}, Intensity: ${emotion.intensity}`}
              >
                {emotion.emotion} <span>{emotion.intensity?.toFixed(2)}</span>
              </div>
            </>
          )}
          {msg.message_created_at && format(new Date(msg.message_created_at), "PPpp")}
        </span>
      </div>

      <div className="relative">
        <div
          className={clsx(
            "prose whitespace-pre-wrap break-words transition-all duration-300 ease-in-out dark:prose-invert",
            isExpanded ? "max-h-none" : "max-h-[12rem] overflow-hidden"
          )}
        >
          <ReactMarkdown>{msg.content}</ReactMarkdown>
        </div>
        {!isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.8 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={clsx(
              "pointer-events-none absolute bottom-[-1px] left-0 right-0 h-12 bg-gradient-to-t to-transparent",
              {
                "from-zinc-100 dark:from-zinc-800": msg.role === "user",
                "from-blue-100 dark:from-blue-800": msg.role === "assistant",
                "from-zinc-200 dark:from-zinc-700": msg.role === "system",
              }
            )}
          />
        )}
      </div>

      {msg.content.length >= 600 && (
        <button
          onClick={() => setExpanded((prev) => !prev)}
          className="mr-1 text-xs text-blue-600 underline"
        >
          {isExpanded ? "Show less" : "Show more"}
        </button>
      )}

      <button
        onClick={() => copyToClipboard(msg.content)}
        className="absolute right-2 top-2 hidden text-xs text-gray-400 group-hover:inline"
        title="Copy to clipboard"
      >
        📋
      </button>
      <div>
        {msg.role === "assistant" && (
          <button
            onClick={regenerate}
            className="mr-1 mt-1 text-xs text-blue-500 underline"
            disabled={loading}
            title="Regenerate response"
          >
            🔄 Regenerate
          </button>
        )}

        {isTherapist && (
          <>
            {msg?.emotion && (
              <button
                onClick={() => setShowDetails((prev) => !prev)}
                className="mr-1 mt-2 text-xs text-blue-600 underline"
              >
                {showDetails ? "Hide annotation details" : "Show annotation details"}
              </button>
            )}
            <button
              onClick={() => setShowAnnotations(true)}
              className="mt-1 text-xs text-blue-600 underline"
            >
              ✏️ Edit Annotation
            </button>
          </>
        )}
      </div>
      {showDetails && (
        <div className="mt-2">
          <AnnotationDiff emotion={msg} />
        </div>
      )}
      {showAnnotations && (
        <AnnotationModal
          onClose={() => setShowAnnotations(false)}
          sourceId={msg.id!}
          sourceType="session"
          initialAnnotation={msg}
          onSaved={() => {
            setShowAnnotations(false);
            onRefresh?.();
          }}
        />
      )}
    </motion.div>
  );
}
