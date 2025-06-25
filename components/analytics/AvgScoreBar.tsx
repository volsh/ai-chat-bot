import { EmotionTrainingRow } from "@/types";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function AvgScoreBar({ rows }: { rows: EmotionTrainingRow[] }) {
  const [loading, setLoading] = useState(true);

  const emotionSummary = useMemo(
    () =>
      rows.reduce((acc: Record<string, { count: number; totalScore: number }>, row: any) => {
        const emotion = row.emotion || "unknown";
        if (!acc[emotion]) acc[emotion] = { count: 0, totalScore: 0 };
        acc[emotion].count++;
        acc[emotion].totalScore += row.score || 0;
        return acc;
      }, {}),
    [rows]
  );

  const annotationScoreChartData = useMemo(() => {
    return Object.entries(emotionSummary)
      .map(([emotion, { count, totalScore }]) => ({
        emotion,
        count,
        averageScore: totalScore / count,
      }))
      .sort((a, b) => b.count - a.count); // sort most common first
  }, [emotionSummary]);

  return (
    <div className="relative rounded border p-4">
      <h4 className="flex items-center gap-2 font-semibold">
        Avg Annotation Score by Emotion{" "}
        <span
          title="Displays which emotions tend to be more frequently annotated or rated as more significant (higher intensities)"
          className="cursor-help text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          📊
        </span>
      </h4>
      {loading && (
        <div className="absolute left-1/2 top-1/2 flex h-[400px] -translate-y-1/2 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-gray-500" />
        </div>
      )}
      <ResponsiveContainer height={300}>
        <BarChart
          data={annotationScoreChartData}
          margin={{ top: 10, right: 30, left: 40, bottom: 30 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="emotion"
            label={{
              value: "Emotion",
              position: "insideBottom",
              offset: -5,
              fontSize: 12,
            }}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            domain={[1, 5]}
            label={{
              value: "Average Score",
              angle: -90,
              position: "insideLeft",
              fontSize: 12,
              offset: 10,
            }}
            tick={{ fontSize: 10 }}
          />
          <Tooltip
            formatter={(value, name, props) => {
              if (name === "averageScore") {
                return [(value as number).toFixed(2), "Average Score"];
              }
              return value;
            }}
            labelFormatter={(label, payload) => {
              if (payload?.[0]?.payload) {
                const item = payload[0].payload as {
                  emotion: string;
                  averageScore: number;
                  count: number;
                };
                return `${item.emotion} (${item.count} entries)`;
              }
              return label;
            }}
          />
          <Bar
            dataKey="averageScore"
            fill="rgba(99,102,241,0.6)"
            radius={[4, 4, 0, 0]}
            onAnimationEnd={() => setLoading(false)}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
