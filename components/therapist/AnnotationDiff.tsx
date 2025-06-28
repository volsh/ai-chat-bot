import React from "react";
import clsx from "clsx";
import { MessageWithEmotion } from "@/types";

interface Props {
  emotion: MessageWithEmotion;
}

export default function AnnotationDiff({ emotion }: Props) {
  const Chip = ({ value, corrected }: { value: string | number; corrected?: boolean }) => (
    <span
      className={clsx(
        "rounded-full px-2 py-1 text-xs",
        corrected
          ? "border border-green-300 bg-green-100 text-green-800"
          : "bg-gray-200 text-gray-800"
      )}
    >
      {corrected ? `✅ ${value}` : value}
    </span>
  );

  if (
    !emotion.emotion &&
    !emotion.tone &&
    !emotion.intensity &&
    !emotion.topic &&
    !emotion.alignment_score
  )
    return null;

  return (
    <div className="mt-2 space-y-2 rounded border bg-white p-2 text-xs text-gray-800 dark:bg-zinc-900 dark:text-gray-200">
      {emotion.emotion && (
        <div className="flex items-center gap-2">
          <span className="font-medium">Emotion:</span>
          {emotion.original_emotion && <Chip value={emotion.original_emotion} />}
          {emotion.corrected_emotion && emotion.corrected_emotion !== emotion.original_emotion && (
            <Chip value={emotion.corrected_emotion} corrected />
          )}
        </div>
      )}

      {emotion.tone && (
        <div className="flex items-center gap-2">
          <span className="font-medium">Tone:</span>
          {emotion.original_tone && <Chip value={emotion.original_tone} />}
          {emotion.corrected_tone && emotion.original_tone !== emotion.corrected_tone && (
            <Chip value={emotion.corrected_tone!} corrected />
          )}
        </div>
      )}

      {emotion.topic && (
        <div className="flex items-center gap-2">
          <span className="font-medium">Topic:</span>
          {emotion.original_topic && <Chip value={emotion.original_topic} />}
          {emotion.corrected_topic && emotion.corrected_topic !== emotion.original_topic && (
            <Chip value={emotion.corrected_tone!} corrected />
          )}
        </div>
      )}
      {emotion.intensity && (
        <div className="flex items-center gap-2">
          <span className="font-medium">Intensity:</span>
          {emotion.original_intensity && <Chip value={emotion.original_intensity} />}
          {emotion.corrected_intensity &&
            emotion.corrected_intensity !== emotion.original_intensity && (
              <Chip value={emotion.corrected_intensity?.toFixed(2)!} corrected />
            )}
        </div>
      )}

      {emotion.alignment_score && (
        <div className="flex items-center gap-2">
          <span className="font-medium">Alignment Score:</span>
          {emotion.original_alignment_score && (
            <Chip value={emotion.original_alignment_score.toFixed(2)} />
          )}
          {emotion.corrected_alignment_score !== emotion.original_alignment_score && (
            <Chip value={emotion.corrected_alignment_score?.toFixed(2)!} corrected />
          )}
        </div>
      )}

      {emotion.note && (
        <div>
          <span className="font-medium">Note:</span>{" "}
          <span className="italic text-blue-600">“{emotion.note}”</span>
        </div>
      )}
    </div>
  );
}
