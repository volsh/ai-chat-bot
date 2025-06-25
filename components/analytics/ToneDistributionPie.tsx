import { EmotionTrainingRow } from "@/types";
import { useEffect, useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

const TONE_COLORS = ["#8e44ad", "#2980b9", "#2ecc71", "#f39c12", "#c0392b", "#d35400", "#16a085"];

export default function ToneDistributionPie({ rows }: { rows: EmotionTrainingRow[] }) {
  const [loading, setLoading] = useState(true);

  const toneCounts = useMemo(
    () =>
      rows.reduce<Record<string, number>>((acc, row) => {
        acc[row.tone || "Unknown"] = (acc[row.tone || "Unknown"] || 0) + 1;
        return acc;
      }, {}),
    [rows]
  );

  const toneData = useMemo(
    () => Object.entries(toneCounts).map(([name, value]) => ({ name, value })),
    [toneCounts]
  );

  return (
    <div>
      <h4 className="font-semibold">Tone Distribution</h4>
      {loading && (
        <div className="flex h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-gray-500" />
        </div>
      )}
      <ResponsiveContainer height={300}>
        <PieChart>
          <Pie
            onAnimationEnd={() => setLoading(false)}
            data={toneData}
            dataKey="value"
            nameKey="name"
            label={(props) => {
              const { cx, cy, midAngle, name, value } = props;
              const total = toneData.reduce((sum, e) => sum + e.value, 0);
              const percent = ((value / total) * 100).toFixed(1);

              // Position labels slightly outside
              const RADIAN = Math.PI / 180;
              const offset = 30; // Distance from the edge
              const x = cx + (props.outerRadius + offset) * Math.cos(-midAngle * RADIAN);
              const y = cy + (props.outerRadius + offset) * Math.sin(-midAngle * RADIAN);

              // Position text on the left/right appropriately
              const textAnchor = Math.cos(-midAngle * RADIAN) > 0 ? "end" : "start";

              return (
                <text x={x} y={y} fontSize={12} dominantBaseline="central" textAnchor={textAnchor}>
                  {name} ({percent}%)
                </text>
              );
            }}
          >
            {toneData.map((_, index) => (
              <Cell key={index} fill={TONE_COLORS[index % TONE_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      )
    </div>
  );
}
