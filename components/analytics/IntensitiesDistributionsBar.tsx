import { EmotionTrainingRow } from "@/types";
import { useMemo, useState } from "react";
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import CustomLegend from "./CustomLegend";
import CustomBarTooltip from "./CustomBarTooltip";

export default function IntensitiesDistributionsBar({ rows }: { rows: EmotionTrainingRow[] }) {
  const [loading, setLoading] = useState(true);

  const uniqueDates = useMemo(() => {
    return Array.from(
      new Set(rows.map((r) => new Date(r.tagged_at).toISOString().split("T")[0]))
    ).sort();
  }, [rows]);

  const uniqueEmotions = useMemo(() => {
    return Array.from(new Set(rows.map((s) => s.emotion).filter(Boolean))) as string[];
  }, [rows]);

  const uniqueTones = useMemo(() => Array.from(new Set(rows.map((e) => e.tone))).sort(), [rows]);

  const toneByEmotion = useMemo(() => {
    const map: Record<string, string> = {};
    rows.forEach((row) => {
      if (!map[row.emotion]) {
        map[row.emotion] = row.tone || "neutral";
      }
    });
    return map;
  }, [rows]);

  const mergedBarData = useMemo(() => {
    return uniqueDates.map((date) => {
      const entry: Record<string, any> = { date };
      uniqueEmotions.forEach((emotion) => {
        entry[emotion] = rows
          .filter(
            (row) =>
              new Date(row.tagged_at).toISOString().split("T")[0] === date &&
              row.emotion === emotion
          )
          .reduce((sum, row) => sum + (row.intensity ?? 0), 0);
      });
      return entry;
    });
  }, [uniqueDates, uniqueEmotions, rows]);

  return (
    <div className="relative rounded border p-4">
      <h4 className="font-semibold">Avg Intensities Distributions for Emotions by Date</h4>
      {loading && (
        <div className="absolute left-1/2 top-1/2 flex h-[400px] -translate-y-1/2 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-gray-500" />
        </div>
      )}
      <ResponsiveContainer height={400}>
        <BarChart data={mergedBarData} barGap={4} barCategoryGap={0}>
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip content={<CustomBarTooltip />} />
          <CustomLegend tones={uniqueTones} />
          {uniqueEmotions.map((emotion) => {
            const tone = toneByEmotion[emotion];
            const color =
              tone === "positive" ? "#2ecc71" : tone === "negative" ? "#e74c3c" : "#f1c40f";

            return (
              <Bar
                onAnimationEnd={() => setLoading(false)}
                key={emotion}
                dataKey={emotion}
                name={emotion}
                stackId="a"
                fill={color}
                stroke={undefined}
                strokeWidth={0}
                radius={[4, 4, 0, 0]}
              >
                <LabelList
                  dataKey={emotion}
                  position="top"
                  formatter={(val: number, entry: any) => {
                    if (!val || isNaN(val) || !entry) return ""; // Guard
                    const total = Object.entries(entry)
                      .filter(([k, v]) => typeof v === "number")
                      .reduce((sum, [, v]) => sum + (v as number), 0);
                    const percent = total > 0 ? ((val / total) * 100).toFixed(1) : "";
                    return `${val.toFixed(2)} (${percent}%)`;
                  }}
                  style={{ fontSize: "10px", fill: "#111" }}
                />
              </Bar>
            );
          })}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
