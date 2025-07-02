"use client";

import { EmotionTrainingRow } from "@/types";
import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import CustomLegend from "./CustomLegend";

export default function IntensitiesDistributionsArea({ rows }: { rows: EmotionTrainingRow[] }) {
  const [loading, setLoading] = useState(rows.length > 0);

  const toneColors: Record<string, string> = {
    positive: "#2ecc71",
    negative: "#e74c3c",
    neutral: "#f1c40f",
  };

  const uniqueDates = useMemo(() => {
    return Array.from(
      new Set(rows.map((r) => new Date(r.message_created_at).toISOString().split("T")[0]))
    ).sort();
  }, [rows]);

  const uniqueTones = useMemo(
    () => Array.from(new Set(rows.map((e) => e.tone?.toLowerCase()).filter(Boolean))).sort(),
    [rows]
  );

  const mergedAreaData = useMemo(() => {
    return uniqueDates.map((date) => {
      const entry: Record<string, any> = { date };
      const rowsOnDate = rows.filter(
        (r) => new Date(r.message_created_at).toISOString().split("T")[0] === date
      );
      const totalCount = rowsOnDate.length;

      for (const tone of uniqueTones) {
        const filtered = rowsOnDate.filter((row) => row.tone?.toLowerCase() === tone);
        const count = filtered.length;

        if (count === 0 || totalCount === 0) {
          entry[tone] = 0;
          entry[`${tone}_count`] = 0;
          entry[`${tone}_avg`] = 0;
        } else {
          const avg = filtered.reduce((sum, row) => sum + (row.intensity ?? 0), 0) / count;
          const signal = avg * (count / totalCount);

          entry[tone] = signal;
          entry[`${tone}_count`] = count;
          entry[`${tone}_avg`] = avg;
        }
      }

      return entry;
    });
  }, [rows, uniqueDates, uniqueTones]);

  const CustomAreaTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <div className="max-w-xs rounded border bg-white p-2 text-sm shadow-sm">
        <div className="mb-1 font-semibold">Date: {label}</div>
        {payload.map((p: any) => {
          const tone = p.name;
          const signal = p.value;
          const avg = p.payload?.[`${tone}_avg`] ?? 0;
          const count = p.payload?.[`${tone}_count`] ?? 0;

          return (
            <div key={tone} className="flex justify-between gap-2">
              <span>{tone}</span>
              <span>
                Signal: {signal.toFixed(2)} ({count} entries, avg {avg.toFixed(2)})
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
        Tone Signal Strength Over Time{" "}
        <span
          title="Displays which tones tend to be more frequent and/or intense per day"
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
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={mergedAreaData}>
          <XAxis dataKey="date" />
          <YAxis domain={[0, "auto"]} />
          <Tooltip content={<CustomAreaTooltip />} />
          <CustomLegend tones={uniqueTones} />
          {uniqueTones.map((tone) => {
            const lowerTone = tone.toLowerCase();
            const color = toneColors[lowerTone] ?? "#cccccc";
            return (
              <Area
                onAnimationEnd={() => setLoading(false)}
                key={tone}
                type="monotone"
                dataKey={tone}
                name={tone}
                stroke={color}
                fill={color}
                fillOpacity={0.4}
                strokeWidth={2}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
