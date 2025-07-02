import { EMOTION_COLORS } from "@/consts/analytics";
import { EmotionTrainingRow } from "@/types";
import { useMemo, useState } from "react";
import { Brush, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const CustomDot = (props: any) => {
  const { cx, cy, payload, value, dataKey } = props;
  if (value == null || isNaN(value)) {
    return null;
  }
  const intensity = parseFloat(payload[dataKey]);
  const tone = payload.tone || "neutral";

  let color = "#999";
  if (tone === "positive")
    color = intensity >= 0.8 ? "#27ae60" : intensity >= 0.5 ? "#2ecc71" : "#a9dfbf";
  else if (tone === "negative")
    color = intensity >= 0.8 ? "#c0392b" : intensity >= 0.5 ? "#e74c3c" : "#f5b7b1";
  else color = intensity >= 0.8 ? "#9b59b6" : intensity >= 0.5 ? "#f1c40f" : "#bdc3c7";

  return <circle cx={cx} cy={cy} r={4} fill={color} stroke="#fff" strokeWidth={1} />;
};
export default function IntensityOverTimeLine({ rows }: { rows: EmotionTrainingRow[] }) {
  const uniqueEmotions = useMemo(() => {
    return Array.from(new Set(rows.map((s) => s.emotion).filter(Boolean))) as string[];
  }, [rows]);

  const lineChartData = useMemo(() => {
    const grouped = rows.reduce(
      (acc, row) => {
        const date = new Date(row.message_created_at).toLocaleDateString();
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

          entry.tone = dominantTone;
        }
        return entry;
      });
  }, [rows, rows]);

  return (
    <div className="relative rounded border p-4">
      <h4 className="flex items-center gap-2 font-semibold">
        Daily Avg Intensity for Emotion
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

          {/* <Brush dataKey="date" height={30} stroke="#8884d8" /> */}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
