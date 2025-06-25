import { EmotionTrainingRow } from "@/types";
import { useMemo } from "react";

/**
 * GroupSummaryBox
 * Summary statistics across a group of EmotionTrainingRows.
 * Works well for multi-client or filtered data.
 */
export default function GroupSummaryBox({ rows }: { rows: EmotionTrainingRow[] }) {
  const stats = useMemo(() => {
    if (!rows.length) {
      return {
        totalEntries: 0,
        commonEmotion: "N/A",
        commonTone: "N/A",
        peakTime: "N/A",
      };
    }

    // Frequency counts
    const emotionCounts = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.emotion] = (acc[row.emotion] || 0) + 1;
      return acc;
    }, {});

    const toneCounts = rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.tone] = (acc[row.tone] || 0) + 1;
      return acc;
    }, {});

    const commonEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    const commonTone = Object.entries(toneCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

    // Peak activity
    const hourlyCounts = rows.reduce<Record<string, number>>((acc, row) => {
      const date = new Date(row.tagged_at);
      const key = `${date.toLocaleDateString()} ${date.getHours()}:00`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const [peakTime] = Object.entries(hourlyCounts).sort((a, b) => b[1] - a[1])[0] ?? ["N/A"];

    return {
      totalEntries: rows.length,
      commonEmotion,
      commonTone,
      peakTime,
    };
  }, [rows]);

  return (
    <div className="mb-4 mt-8 flex flex-col gap-2 rounded border p-4 text-sm">
      <div>
        <span className="font-bold">Total Entries:</span> {stats.totalEntries}
      </div>
      <div>
        <span className="font-bold">Most Common Emotion:</span> {stats.commonEmotion}
      </div>
      <div>
        <span className="font-bold">Most Common Tone:</span> {stats.commonTone}
      </div>
      <div>
        <span className="font-bold">Peak Activity (Date & Hour):</span> {stats.peakTime}
      </div>
    </div>
  );
}
