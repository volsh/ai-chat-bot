"use client";

import { EmotionTrainingRow } from "@/types";
import { useMemo, useState } from "react";
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import CustomLegend from "./CustomLegend";

export default function IntensitiesDistributionsBar({ rows }: { rows: EmotionTrainingRow[] }) {
  const [loading, setLoading] = useState(rows.length > 0);

  const uniqueDates = useMemo(() => {
    return Array.from(
      new Set(rows.map((r) => new Date(r.message_created_at).toISOString().split("T")[0]))
    ).sort();
  }, [rows]);

  const uniqueEmotions = useMemo(() => {
    return Array.from(new Set(rows.map((s) => s.emotion).filter(Boolean))) as string[];
  }, [rows]);

  const uniqueTones = useMemo(
    () => Array.from(new Set(rows.map((e) => e.tone).filter(Boolean))).sort(),
    [rows]
  );

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
      const rowsOnDate = rows.filter(
        (r) => new Date(r.message_created_at).toISOString().split("T")[0] === date
      );

      const totalCount = rowsOnDate.length;

      uniqueEmotions.forEach((emotion) => {
        const filtered = rowsOnDate.filter((row) => row.emotion === emotion);
        const count = filtered.length;

        if (count === 0) return;

        const avg = filtered.reduce((sum, row) => sum + (row.intensity ?? 0), 0) / count;

        const signal = avg * (count / totalCount);

        entry[emotion] = signal;
        entry[`${emotion}_avg`] = avg;
        entry[`${emotion}_count`] = count;
      });

      return entry;
    });
  }, [uniqueDates, uniqueEmotions, rows]);

  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="max-w-xs rounded border bg-white p-2 text-sm shadow-sm">
        <div className="mb-1 font-semibold">Date: {label}</div>
        {payload.map((p: any) => {
          const emotion = p.name;
          const signal = p.value;
          const avg = p.payload?.[`${emotion}_avg`] ?? 0;
          const count = p.payload?.[`${emotion}_count`] ?? 0;

          return (
            <div key={emotion} className="flex justify-between gap-2">
              <span>{emotion}</span>
              <span>
                Signal: {signal.toFixed(2)} (Avg: {avg.toFixed(2)} × {count} entries)
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative rounded border p-4">
      <h4 className="flex items-center gap-2 font-semibold">
        Emotion Signal Strength by Date{" "}
        <span
          title="Displays which emotions tend to be more frequent and/or significant (higher intensities)"
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
                radius={[4, 4, 0, 0]}
              >
                <LabelList
                  dataKey={emotion}
                  position="top"
                  formatter={(val: number, entry: any) => {
                    if (!val || isNaN(val) || !entry) return "";
                    return `${val.toFixed(2)}`;
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
