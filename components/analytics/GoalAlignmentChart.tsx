import { EmotionTrainingRow } from "@/types";
import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";

export function GoalAlignmentTrendChart({ rows }: { rows: EmotionTrainingRow[] }) {
  const uniqueGoals = Array.from(new Set(rows.map((r) => r.goal).filter(Boolean)));

  const data = useMemo(() => {
    const grouped = rows.reduce<Record<string, Record<string, { total: number; count: number }>>>(
      (acc, row) => {
        if (!row.goal || !row.message_created_at || row.alignment_score == null) return acc;

        const date = new Date(row.message_created_at).toISOString().split("T")[0];
        if (!acc[date]) acc[date] = {};
        if (!acc[date][row.goal]) acc[date][row.goal] = { total: 0, count: 0 };

        acc[date][row.goal].total += row.alignment_score;
        acc[date][row.goal].count += 1;

        return acc;
      },
      {}
    );

    return Object.entries(grouped)
      .map(([date, goalData]) => {
        const entry: Record<string, any> = { date };
        for (const goal in goalData) {
          const { total, count } = goalData[goal];
          entry[goal] = parseFloat((total / count).toFixed(3));
        }
        return entry;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [rows]);

  return (
    <div className="relative rounded border p-4 text-sm">
      <h4 className="flex items-center gap-2 font-semibold">
        Goal Alignment Trends
        <span
          title="Displays average alignment score for each goal across time."
          className="cursor-help text-gray-500 hover:text-gray-700"
        >
          📈
        </span>
      </h4>

      {rows.length === 0 && (
        <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
          No data available.
        </div>
      )}

      {data.length > 0 && (
        <ResponsiveContainer height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 1]} />
            <Tooltip />
            <Legend />

            {uniqueGoals.map((goal, index) => {
              const color = `hsl(${(index * 60) % 360}, 70%, 50%)`;
              return (
                <Line
                  key={goal}
                  dataKey={goal}
                  name={goal}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      )}

      <div className="mt-2 text-xs text-gray-600">
        Shows the average <strong>alignment score</strong> (0–1) for each goal over time.
      </div>
    </div>
  );
}
