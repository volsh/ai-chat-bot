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
  DotProps,
} from "recharts";

export function SessionScoreTrendChart({ rows }: { rows: EmotionTrainingRow[] }) {
  // Group rows by session_id and calculate score per session
  const sessionScores = useMemo(() => {
    const grouped: Record<string, EmotionTrainingRow[]> = {};
    for (const row of rows) {
      if (!row.session_id) continue;
      if (!grouped[row.session_id]) grouped[row.session_id] = [];
      grouped[row.session_id].push(row);
    }

    const result: {
      session_id: string;
      date: string;
      score: number;
      toneScore: number;
      avgAlignment: number;
      toneBalance: number;
    }[] = [];

    for (const [session_id, groupRows] of Object.entries(grouped)) {
      const totalMessages = groupRows.length;

      const alignmentScores = groupRows
        .map((r) => r.alignment_score)
        .filter((v): v is number => typeof v === "number");

      const avgAlignment =
        alignmentScores.reduce((sum, v) => sum + v, 0) / (alignmentScores.length || 1);

      const positiveRows = groupRows.filter(
        (r) => r.tone === "positive" && typeof r.intensity === "number"
      );
      const negativeRows = groupRows.filter(
        (r) => r.tone === "negative" && typeof r.intensity === "number"
      );

      const totalPositiveIntensity = positiveRows.reduce((sum, r) => sum + (r.intensity || 0), 0);
      const totalNegativeIntensity = negativeRows.reduce((sum, r) => sum + (r.intensity || 0), 0);

      const toneRowCount = positiveRows.length + negativeRows.length;
      const toneBalance =
        toneRowCount > 0 ? (totalPositiveIntensity - totalNegativeIntensity) / toneRowCount : 0;
      const toneScore = (toneBalance + 1) / 2;

      const weights = {
        alignment: alignmentScores.length > 0 ? 1 : 0,
        tone: toneRowCount > 0 ? 1 : 0,
      };
      const totalWeight = weights.alignment + weights.tone || 1;

      const finalScore =
        (avgAlignment * weights.alignment + toneScore * weights.tone) / totalWeight;

      const date = new Date(groupRows[0].message_created_at).toISOString().split("T")[0];

      result.push({
        session_id,
        date,
        score: finalScore,
        toneScore,
        avgAlignment,
        toneBalance,
      });
    }

    return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [rows]);

  const getColorForScore = (score: number) => {
    if (score >= 0.8) return "green";
    if (score >= 0.6) return "blue";
    if (score >= 0.4) return "orange";
    return "red";
  };

  const CustomDot = (props: DotProps & { payload?: any }) => {
    const { cx, cy, payload } = props;
    if (!payload) return null;
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={getColorForScore(payload.score)}
        stroke="#fff"
        strokeWidth={1}
      />
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length > 0) {
      const data = payload[0].payload;
      const { date, score, avgAlignment, toneScore, toneBalance } = data;

      return (
        <div className="max-w-xs rounded border bg-white p-2 text-xs shadow">
          <div className="mb-1 font-semibold">Session on {date}</div>
          <div>
            Score: <strong>{score.toFixed(2)}</strong>
          </div>
          <div>Alignment Score: {avgAlignment.toFixed(2)}</div>
          <div>Tone Score: {toneScore.toFixed(2)}</div>
          <div>Net Tone Balance: {toneBalance.toFixed(2)}</div>
          <hr className="my-1" />
          <div className="text-gray-500">
            Formula: <code>((alignment × 1) + (tone × 1)) ÷ 2</code>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="relative rounded border p-4 text-sm">
      <h4 className="mb-2 font-semibold">Session Score Over Time</h4>
      {sessionScores.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
          No data available.
        </div>
      ) : (
        <ResponsiveContainer height={300}>
          <LineChart data={sessionScores}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 1]} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotone"
              dataKey="score"
              name="Session Score"
              stroke="#8884d8"
              dot={<CustomDot />}
              strokeWidth={2}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
