import { EmotionTrainingRow } from "@/types";
import { useMemo } from "react";
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
  // Extract unique goals
  const uniqueGoals = Array.from(new Set(rows.map((r) => r.goal).filter(Boolean)));

  // Group by date and goal
  const data = useMemo(() => {
    const grouped = rows.reduce<Record<string, Record<string, number>>>((acc, row) => {
      if (!row.goal || !row.tagged_at) return acc;

      const date = new Date(row.tagged_at).toISOString().split("T")[0];
      if (!acc[date]) acc[date] = {};
      acc[date][row.goal] = (acc[date][row.goal] || 0) + 1;

      return acc;
    }, {});

    return Object.entries(grouped)
      .map(([date, goalCounts]) => ({ date, ...goalCounts }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [rows]);

  if (!data.length) {
    return <div className="text-gray-500">No goal data available for trend chart.</div>;
  }

  return (
    <div className="rounded border p-4 text-sm">
      <h4 className="flex items-center gap-2 font-semibold">
        Goal Alignment Trends
        <span
          title="Displays mentions of each goal across time."
          className="cursor-help text-gray-500 hover:text-gray-700"
        >
          📈
        </span>
      </h4>

      <ResponsiveContainer height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
          <YAxis />
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
                isAnimationActive={false}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>

      <div className="mt-2 text-xs text-gray-600">
        Shows how often each goal is mentioned across time, making trends in goal focus more
        visible.
      </div>
    </div>
  );
}
