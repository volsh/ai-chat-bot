import { MessageWithEmotion } from "@/types";

export default function getSeverityBreakdown(flags: MessageWithEmotion[]) {
  const raw = flags.reduce(
    (acc, f) => {
      acc[f.severity] = (acc[f.severity] || 0) + 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );
  const total = raw.high + raw.medium + raw.low || 1;
  return {
    counts: raw,
    percentages: {
      high: Math.round((raw.high / total) * 100),
      medium: Math.round((raw.medium / total) * 100),
      low: Math.round((raw.low / total) * 100),
    },
  };
}
