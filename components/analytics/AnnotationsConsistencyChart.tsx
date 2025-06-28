import { EmotionTrainingRow } from "@/types";
import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LabelList,
} from "recharts";

export function AnnotationsConsistencyChart({ rows }: { rows: EmotionTrainingRow[] }) {
  const [loading, setLoading] = useState(rows.length > 0);

  const data = useMemo(() => {
    if (!rows.length) return [];

    const metrics = [
      { key: "emotion", original: "original_emotion" },
      { key: "tone", original: "original_tone" },
      { key: "intensity", original: "original_intensity" },
      { key: "topic", original: "original_topic" },
    ] as const;

    return metrics.map((metric) => {
      const total = rows.length;
      const corrections = rows.filter((r) => r[metric.original] !== r[metric.key]).length;

      return {
        metric: metric.key,
        Corrected: corrections,
        Unchanged: total - corrections,
      };
    });
  }, [rows]);

  return (
    <div className="relative rounded border p-4">
      <h4 className="flex items-center gap-2 font-semibold">
        Overall AI/Annotation Consistency
        <span
          title="Displays Overall AI vs therapist agreements"
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
      {rows.length === 0 && (
        <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
          No data available.
        </div>
      )}
      <ResponsiveContainer height={300}>
        <BarChart data={data}>
          <XAxis dataKey="metric" />
          <YAxis />
          <Tooltip formatter={(value) => `${value}`} />
          <Legend />
          <Bar dataKey="Corrected" fill="#e74c3c">
            <LabelList
              dataKey="Corrected"
              position="top"
              fontSize={10}
              onAnimationEnd={() => setLoading(false)}
            />
          </Bar>
          <Bar dataKey="Unchanged" fill="#2ecc71" onAnimationEnd={() => setLoading(false)}>
            <LabelList dataKey="Unchanged" position="top" fontSize={10} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
