import { EmotionTrainingRow } from "@/types";
import { useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
  DotProps,
} from "recharts";
import { calculateSessionScore } from "@/utils/analytics/calculateSessionScore";
import Select from "@/components/ui/select";
import { Info } from "lucide-react";
import { Tooltip as ReactTooltip } from "react-tooltip"; // Make sure this is installed and imported
import { format } from "date-fns";

interface Props {
  rows: EmotionTrainingRow[];
}

const ITEMS_PER_PAGE = 1;
const SMOOTHING_WINDOW = 3;

export function SessionScoreTrendChart({ rows }: Props) {
  const [view, setView] = useState<"aggregate" | "byTreatment">("aggregate");
  const [page, setPage] = useState(0);

  const filtered = useMemo(
    () => rows.filter((r) => Boolean(r.message_created_at && r.session_id)),
    [rows]
  );

  const chartData = useMemo(() => {
    const allDatesSet = new Set<string>();
    const sessionDateGroups = new Map<string, EmotionTrainingRow[]>();

    for (const row of filtered) {
      const date = row.message_created_at?.split("T")[0];
      if (!row.session_id || !date) continue;
      allDatesSet.add(date);

      const key = `${row.session_id}_${date}`;
      if (!sessionDateGroups.has(key)) sessionDateGroups.set(key, []);
      sessionDateGroups.get(key)!.push(row);
    }

    const sessionSummaries = Array.from(sessionDateGroups.entries()).map(([key, msgs]) => {
      const { finalScore, averageAlignment, netEmotionalToneBalance } = calculateSessionScore(msgs);
      const [session_id, date] = key.split("_");

      return {
        session_id,
        treatment_id: msgs[0]?.treatment_id ?? "unknown",
        treatment_name: msgs[0]?.treatment_name ?? "unknown",
        treatment_status: msgs[0]?.treatment_status ?? "unknown",
        treatment_created_at: msgs[0]?.treatment_created_at ?? "unknown",
        goal: msgs[0]?.goal ?? "unknown",
        date,
        score: finalScore ?? 0,
        toneScore: (netEmotionalToneBalance + 1) / 2,
        avgAlignment: averageAlignment,
        toneBalance: netEmotionalToneBalance,
      };
    });

    const smoothSeries = (data: any[], key: string) => {
      return data.map((_, i) => {
        const slice = data.slice(Math.max(0, i - SMOOTHING_WINDOW + 1), i + 1);
        const avg = slice.reduce((sum, d) => sum + (d[key] ?? 0), 0) / (slice.length || 1);
        return avg;
      });
    };

    if (view === "aggregate") {
      const dateMap = new Map<string, typeof sessionSummaries>();
      for (const s of sessionSummaries) {
        if (!dateMap.has(s.date)) dateMap.set(s.date, []);
        dateMap.get(s.date)!.push(s);
      }
      const allDates = Array.from(allDatesSet).sort((a, b) => a.localeCompare(b));

      const base = allDates.map((date) => {
        const items = dateMap.get(date) ?? [];
        if (!items.length) return { date, score: 0, toneScore: 0, avgAlignment: 0, toneBalance: 0 };
        const avg = (key: keyof (typeof items)[0]) =>
          items.reduce((sum, item) => sum + ((item[key] as number) || 0), 0) / items.length;
        return {
          date,
          score: avg("score"),
          toneScore: avg("toneScore"),
          avgAlignment: avg("avgAlignment"),
          toneBalance: avg("toneBalance"),
        };
      });

      return base.map((d, i) => ({
        ...d,
        smoothedScore: smoothSeries(base, "score")[i],
        smoothedToneScore: smoothSeries(base, "toneScore")[i],
        smoothedAvgAlignment: smoothSeries(base, "avgAlignment")[i],
        smoothedToneBalance: smoothSeries(base, "toneBalance")[i],
      }));
    }

    const treatmentMap = new Map<string, Map<string, typeof sessionSummaries>>();
    for (const s of sessionSummaries) {
      if (!treatmentMap.has(s.treatment_name)) treatmentMap.set(s.treatment_name, new Map());
      const dateMap = treatmentMap.get(s.treatment_name)!;
      if (!dateMap.has(s.date)) dateMap.set(s.date, []);
      dateMap.get(s.date)!.push(s);
    }

    const result = Array.from(treatmentMap.entries()).map(([treatment_name, dateMap]) => {
      const treatmentDates = Array.from(dateMap.keys()).sort((a, b) => a.localeCompare(b));

      const base = treatmentDates.map((date, index) => {
        const summaries = dateMap.get(date) ?? [];
        if (!summaries.length)
          return {
            treatment_name,
            treatment_created_at: "Unknown",
            treatment_status: "Unknown",
            goal: "Unknown",
            date,
            score: 0,
            toneScore: 0,
            avgAlignment: 0,
            toneBalance: 0,
          };
        const avg = (key: keyof (typeof summaries)[0]) =>
          summaries.reduce((sum, s) => sum + ((s[key] as number) || 0), 0) / summaries.length;
        return {
          treatment_name,
          treatment_created_at: summaries?.[index]?.treatment_created_at ?? "Unknown",
          treatment_status: summaries?.[index]?.treatment_status ?? "Unknown",
          goal: summaries?.[index]?.goal ?? "Unknown",
          date,
          score: avg("score"),
          toneScore: avg("toneScore"),
          avgAlignment: avg("avgAlignment"),
          toneBalance: avg("toneBalance"),
        };
      });

      const smoothed = base.map((d, i) => ({
        ...d,
        smoothedScore: smoothSeries(base, "score")[i],
        smoothedToneScore: smoothSeries(base, "toneScore")[i],
        smoothedAvgAlignment: smoothSeries(base, "avgAlignment")[i],
        smoothedToneBalance: smoothSeries(base, "toneBalance")[i],
      }));

      const rawImprovementPct = ((base.at(-1)?.score ?? 0) - (base.at(0)?.score ?? 0)) * 100;

      const smoothedImprovementPct =
        ((smoothed.at(-1)?.smoothedScore ?? 0) - (smoothed.at(0)?.smoothedScore ?? 0)) * 100;
      return {
        treatment_name,
        treatment_created_at: smoothed[0]?.treatment_created_at,
        treatment_status: smoothed[0]?.treatment_status,
        goal: smoothed[0]?.goal,
        rawImprovementPct,
        smoothedImprovementPct,
        sessions: smoothed,
      };
    });

    return result;
  }, [filtered, view]);

  const start = page * ITEMS_PER_PAGE;
  const paginated = (chartData as any[]).slice(start, start + ITEMS_PER_PAGE);
  const totalPages = Math.ceil((chartData as any[]).length / ITEMS_PER_PAGE);

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
        fill={getColorForScore(payload.smoothedScore ?? payload.score)}
        stroke="#fff"
        strokeWidth={1}
      />
    );
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload?.length > 0) {
      const d = payload[0].payload;
      const {
        date,
        score,
        smoothedScore,
        avgAlignment,
        toneScore,
        toneBalance,
        smoothedAvgAlignment,
        smoothedToneScore,
        smoothedToneBalance,
      } = d;

      return (
        <div className="max-w-xs rounded border border-gray-300 bg-white p-2 text-xs text-black shadow dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200">
          <div className="mb-1 font-semibold">{date ? `Date: ${date}` : "Session"}</div>
          <div>
            Raw Score: <strong>{score?.toFixed(2)}</strong>
          </div>
          <div>
            Smoothed Score: <strong>{smoothedScore?.toFixed(2)}</strong>
          </div>
          {typeof avgAlignment === "number" && (
            <div>Alignment Score: {avgAlignment.toFixed(2)}</div>
          )}
          {typeof toneScore === "number" && <div>Tone Score: {toneScore.toFixed(2)}</div>}
          {typeof toneBalance === "number" && <div>Net Tone Balance: {toneBalance.toFixed(2)}</div>}
          {typeof avgAlignment === "number" && typeof toneScore === "number" && (
            <>
              <hr className="my-1" />
              <div className="text-gray-500">
                Formula:{" "}
                <code>
                  (({avgAlignment.toFixed(2)} × 1) + ({toneScore.toFixed(2)} × 1)) ÷ 2
                </code>
              </div>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  if (!filtered.length) {
    return <div className="text-sm text-gray-500">No data to show.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <h4 className="flex items-baseline gap-2 font-semibold">
          {view === "aggregate" ? "Average Session Score Over Time" : "Session Scores by Treatment"}
          <span
            title="Session Score reflects how positively and meaningfully a session progressed. It combines the balance of emotional tone (positive vs. negative intensity) and how well messages align with the treatment goal. Higher scores indicate stronger alignment and more constructive emotional tone."
            className="cursor-help text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            📊
          </span>

          {view === "aggregate" &&
            (() => {
              let rawPct = null;
              let smoothedPct = null;

              if (
                Array.isArray(chartData) &&
                "score" in (chartData[0] ?? {}) &&
                "score" in (chartData.at?.(-1) ?? {})
              ) {
                const firstRaw = chartData[0] as { score: number };
                const lastRaw = chartData.at(-1) as { score: number };
                const rawDiff = (lastRaw.score ?? 0) - (firstRaw.score ?? 0);
                rawPct = (rawDiff * 100).toFixed(1);
              }

              if (
                Array.isArray(chartData) &&
                "smoothedScore" in (chartData[0] ?? {}) &&
                "smoothedScore" in (chartData.at?.(-1) ?? {})
              ) {
                const firstSmoothed = chartData[0] as { smoothedScore: number };
                const lastSmoothed = chartData.at(-1) as { smoothedScore: number };
                const smoothDiff =
                  (lastSmoothed.smoothedScore ?? 0) - (firstSmoothed.smoothedScore ?? 0);
                smoothedPct = (smoothDiff * 100).toFixed(1);
              }

              return (
                <span className="flex items-baseline gap-1 text-xs font-normal text-gray-500">
                  {}
                  <span
                    className={parseFloat(rawPct || "0") >= 0 ? "text-green-600" : "text-red-600"}
                  >
                    {rawPct}% raw
                  </span>
                  {smoothedPct !== null && (
                    <>
                      ,{" "}
                      <span
                        className={parseFloat(smoothedPct) >= 0 ? "text-green-600" : "text-red-600"}
                      >
                        {smoothedPct}% smoothed
                      </span>
                    </>
                  )}
                  improvement
                  <span
                    data-tooltip-id="score-tooltip"
                    data-tooltip-html="Raw = final session scores as calculated.<br />Smoothed = 3-day rolling average to reduce noise and highlight trends."
                    className="ml-1 cursor-help text-gray-400"
                  >
                    <Info size={14} />
                  </span>
                  <ReactTooltip
                    id="score-tooltip"
                    place="top"
                    className="!max-w-xs !border !border-gray-300 !bg-white !text-xs !text-black dark:!border-gray-700 dark:!bg-gray-900 dark:!text-gray-200"
                  />
                </span>
              );
            })()}
        </h4>

        <div className="w-48">
          <Select
            label="View Mode"
            options={[
              { label: "Aggregate View", value: "aggregate" },
              { label: "By Treatment", value: "byTreatment" },
            ]}
            value={view}
            onChange={(e) => setView(e.target.value as any)}
          />
        </div>
      </div>
      {view === "aggregate" ? (
        <div className="rounded border p-4 text-sm">
          <ResponsiveContainer height={300}>
            <LineChart data={chartData as any[]}>
              {" "}
              <CartesianGrid
                strokeDasharray="3 3"
                strokeOpacity={0.2}
                stroke="#6b7280" // Tailwind gray-500 for light
              />
              <XAxis dataKey="date" />
              <YAxis domain={[0, 1]} />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="score"
                name="Raw Score"
                stroke="#9ca3af" // Tailwind gray-400
                strokeWidth={1}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="smoothedScore"
                name="Smoothed Score"
                stroke="#4ade80"
                strokeWidth={2}
                dot={<CustomDot />}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4">
            {(paginated as any[]).map((t) => (
              <div key={t.treatment_name} className="rounded border p-3 text-sm shadow-sm">
                <div className="mb-1 flex flex-wrap items-center gap-2 font-medium">
                  Treatment: {t.treatment_name}
                  <span
                    className="ml-1 cursor-help text-gray-400"
                    data-tooltip-id={`treatment-tooltip-${t.treatment_id}`}
                    data-tooltip-html={`
      <strong>Goal:</strong> ${t.goal}<br />
      <strong>Status:</strong> ${t.treatment_status}<br />
      <strong>Started:</strong> ${format(new Date(t.treatment_created_at), "PPP")}
    `}
                  >
                    <Info size={14} />
                  </span>
                  <ReactTooltip
                    id={`treatment-tooltip-${t.treatment_id}`}
                    place="top"
                    className="!max-w-xs !border !border-gray-300 !bg-white !text-xs !text-black dark:!border-gray-700 dark:!bg-gray-900 dark:!text-gray-200"
                  />
                  <span className="flex items-center gap-1 text-xs font-normal text-gray-500">
                    <span className={t.rawImprovementPct >= 0 ? "text-green-600" : "text-red-600"}>
                      {t.rawImprovementPct.toFixed(1)}% raw
                    </span>
                    ,{" "}
                    <span
                      className={t.smoothedImprovementPct >= 0 ? "text-green-600" : "text-red-600"}
                    >
                      {t.smoothedImprovementPct.toFixed(1)}% smoothed
                    </span>
                    improvement
                    <span
                      data-tooltip-id="score-tooltip"
                      data-tooltip-html="Raw = final session scores as calculated.<br />Smoothed = 3-day rolling average to reduce noise and highlight trends."
                      className="ml-1 cursor-help text-gray-400"
                    >
                      <Info size={14} />
                    </span>
                    <ReactTooltip
                      id="score-tooltip"
                      place="top"
                      className="!max-w-xs !border !border-gray-300 !bg-white !text-xs !text-black dark:!border-gray-700 dark:!bg-gray-900 dark:!text-gray-200"
                    />
                  </span>
                </div>

                <ResponsiveContainer height={300}>
                  <LineChart data={t.sessions}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      strokeOpacity={0.2}
                      stroke="#6b7280" // Tailwind gray-500 for light
                    />
                    <XAxis dataKey="date" />
                    <YAxis domain={[0, 1]} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line
                      type="monotone"
                      dataKey="score"
                      name="Raw Score"
                      stroke="#9ca3af" // Tailwind gray-400
                      strokeWidth={1}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="smoothedScore"
                      name="Smoothed Score"
                      stroke="#4ade80"
                      strokeWidth={2}
                      dot={<CustomDot />}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
          {totalPages > 0 && (
            <div className="mt-2 flex justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="rounded border px-2 py-1 text-sm disabled:opacity-50"
              >
                Prev
              </button>
              <span className="text-sm">
                Page {page + 1} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="rounded border px-2 py-1 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
