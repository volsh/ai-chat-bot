import { EmotionTrainingRow } from "@/types";
import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import CustomLegend from "./CustomLegend";

export default function IntensitiesDistributionsArea({ rows }: { rows: EmotionTrainingRow[] }) {
  const [loading, setLoading] = useState(true);

  const uniqueDates = useMemo(() => {
    return Array.from(
      new Set(rows.map((r) => new Date(r.tagged_at).toISOString().split("T")[0]))
    ).sort();
  }, [rows]);

  const uniqueTones = useMemo(() => Array.from(new Set(rows.map((e) => e.tone))).sort(), [rows]);

  const mergedAreaData = useMemo(() => {
    return uniqueDates.map((date) => {
      const entry: Record<string, any> = { date };
      for (const tone of uniqueTones) {
        const total = rows
          .filter(
            (row) =>
              new Date(row.tagged_at).toISOString().split("T")[0] === date && row.tone === tone
          )
          .reduce((sum, row) => sum + (row.intensity ?? 0), 0);
        entry[tone] = total;
      }
      return entry;
    });
  }, [rows, uniqueDates, uniqueTones]);

  return (
    <div className="relative rounded border p-4">
      <h4 className="font-semibold">Avg Intensities Distributions for Tones by Date</h4>
      {/* {loading && (
        <div className="flex h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-gray-500" />
        </div>
      )} */}
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart data={mergedAreaData}>
          {loading && (
            <div className="absolute left-1/2 top-1/2 flex h-[400px] -translate-y-1/2 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-gray-500" />
            </div>
          )}
          <XAxis dataKey="date" />
          <YAxis domain={[0, "auto"]} />
          <Tooltip />
          <CustomLegend tones={uniqueTones} />
          {uniqueTones.map((tone) => {
            const color =
              tone === "positive" ? "#2ecc71" : tone === "negative" ? "#e74c3c" : "#f1c40f";
            return (
              <Area
                onAnimationEnd={() => setLoading(false)}
                key={tone}
                type="monotone"
                dataKey={tone}
                name={tone.charAt(0).toUpperCase() + tone.slice(1)}
                stroke={color}
                fill={color}
                fillOpacity={0.3}
                stackId="1"
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
