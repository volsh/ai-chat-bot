import clsx from "clsx";
import React from "react";
import { getSeverityFromEmotion } from "@/utils/emotions/getSeverityFromEmotion";

export function SeverityBadge({ intensity, tone }: { intensity: number; tone: string }) {
  const severity = getSeverityFromEmotion(intensity, tone);

  const color =
    severity === "high"
      ? "bg-red-600 text-white"
      : severity === "medium"
        ? "bg-yellow-500 text-black"
        : "bg-green-500 text-white";

  return (
    <span className={clsx("mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium", color)}>
      {severity.toUpperCase()}
    </span>
  );
}
