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

  return (
    <div className="mt-2 space-y-2 rounded border bg-white p-2 text-xs text-gray-800 dark:bg-zinc-900 dark:text-gray-200">
      <div className="flex items-center gap-2">
        <span className="font-medium">Emotion:</span>
        <Chip value={emotion.original_emotion!} />
        {emotion.original_emotion !== emotion.emotion && (
          <Chip value={emotion.emotion!} corrected />
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="font-medium">Tone:</span>
        <Chip value={emotion.original_tone!} />
        {emotion.original_tone !== emotion.tone && (
          <Chip value={emotion.tone!} corrected />
        )}
      </div>

      {emotion.original_topic && (
        <div className="flex items-center gap-2">
          <span className="font-medium">Topic:</span>
          <Chip value={emotion.original_topic!} />
          {emotion.original_topic !== emotion.topic && (
            <Chip value={emotion.topic!} corrected />
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="font-medium">Intensity:</span>
        <Chip value={emotion.original_intensity?.toFixed(2)!} />
        {emotion.original_intensity !== emotion.intensity && (
          <Chip value={emotion.intensity?.toFixed(2)!} corrected />
        )}
      </div>

      {emotion.note && (
        <div>
          <span className="font-medium">Note:</span>{" "}
          <span className="italic text-blue-600">“{emotion.note}”</span>
        </div>
      )}
    </div>
  );
}
