import { EMOTION_COLORS } from "@/consts/analytics";
import { EmotionTrainingRow } from "@/types";
import { useMemo, useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

export default function EmotionDistributionPie({ rows }: { rows: EmotionTrainingRow[] }) {
  const [loading, setLoading] = useState(true);

  const emotionCount = useMemo(
    () =>
      rows.reduce((acc: Record<string, number>, row: any) => {
        const emotion = row.emotion || "unknown";
        if (!acc[emotion]) acc[emotion] = 0;
        acc[emotion]++;
        return acc;
      }, {}),
    [rows]
  );

  const emotionData = useMemo(
    () =>
      Object.entries(emotionCount).map(([emotion, count]) => ({
        name: emotion,
        value: count,
      })),
    [emotionCount]
  );

  return (
    <div>
      <h4 className="font-semibold">Emotion Distribution</h4>
      {loading && (
        <div className="flex h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-gray-500" />
        </div>
      )}
      <ResponsiveContainer height={300}>
        <PieChart>
          <Pie
            onAnimationEnd={() => setLoading(false)}
            data={emotionData}
            dataKey="value"
            nameKey="name"
            label={(props) => {
              const { x, y, name, value } = props;
              const total = emotionData.reduce((sum, item) => sum + item.value, 0);
              const percent = ((value / total) * 100).toFixed(1);
              return (
                <text
                  x={x}
                  y={y}
                  fontSize={8}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill="#111"
                >
                  {name} ({percent}%)
                </text>
              );
            }}
          >
            {emotionData.map((_, index) => (
              <Cell key={index} fill={EMOTION_COLORS[index % EMOTION_COLORS.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
