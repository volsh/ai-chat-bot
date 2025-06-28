import { EMOTION_COLORS } from "@/consts/analytics";
import { EmotionTrainingRow } from "@/types";
import { useMemo, useState } from "react";
import { Brush, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import CustomDot from "./CustomDot";

export default function IntensityOverTimeLine({ rows }: { rows: EmotionTrainingRow[] }) {
  const uniqueEmotions = useMemo(() => {
    return Array.from(new Set(rows.map((s) => s.emotion).filter(Boolean))) as string[];
  }, [rows]);

  const lineChartData = useMemo(() => {
    const grouped = rows.reduce(
      (acc, row) => {
        const date = new Date(row.tagged_at).toLocaleDateString();
        if (!acc[date]) acc[date] = {};
        if (!acc[date][row.emotion]) acc[date][row.emotion] = [];
        acc[date][row.emotion].push(row);
        return acc;
      },
      {} as Record<string, Record<string, typeof rows>>
    );

    return Object.keys(grouped)
      .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())
      .map((date) => {
        const entry: Record<string, any> = { date };
        for (const emotion of uniqueEmotions) {
          const rows = grouped[date][emotion];
          if (!rows) continue;

          entry[emotion] = rows.reduce((sum, r) => sum + r.intensity, 0) / rows.length;

          // Keep the dominant tone for this emotion-date
          const dominantTone = (() => {
            const counts = rows.reduce(
              (countMap, r) => {
                countMap[r.tone] = (countMap[r.tone] || 0) + 1;
                return countMap;
              },
              {} as Record<string, number>
            );
            return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
          })();

          entry[`${emotion}_tone`] = dominantTone;
        }
        return entry;
      });
  }, [rows, rows]);

  return (
    <div className="relative rounded border p-4">
      <h4 className="flex items-center gap-2 font-semibold">
        Avg Intensity for Emotion Over Time
        <span
          title="Filter by one or a few emotions for a clearer view"
          className="cursor-help text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          📊
        </span>
      </h4>
      {rows.length === 0 && (
        <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
          No data available.
        </div>
      )}
      <ResponsiveContainer height={400}>
        <LineChart data={lineChartData} margin={{ top: 20, right: 60, left: 40, bottom: 30 }}>
          <XAxis dataKey="date" />
          <YAxis domain={["auto", "auto"]} />
          <Tooltip
            formatter={(value: number) => value.toFixed(2)}
            labelFormatter={(label) => `Date: ${label}`}
          />
          {uniqueEmotions.map((emotion, index) => {
            const lineColor = EMOTION_COLORS[index % EMOTION_COLORS.length];
            return (
              <Line
                key={emotion}
                name={emotion}
                dataKey={emotion}
                stroke={lineColor}
                type="monotone"
                connectNulls
                isAnimationActive={false}
                dot={(props) => <CustomDot {...props} />}
              />
            );
          })}

          <Brush dataKey="date" height={30} stroke="#8884d8" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
