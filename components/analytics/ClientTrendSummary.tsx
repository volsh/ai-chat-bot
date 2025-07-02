"use client";

import { EmotionTrainingRow } from "@/types";
import { useMemo } from "react";

export default function ClientOverviewBox({ rows }: { rows: EmotionTrainingRow[] }) {
  const stats = useMemo(() => {
    if (!rows.length) {
      return {
        thisMonthCount: 0,
        lastMonthCount: 0,
        thisMonthAvgIntensity: 0,
        lastMonthAvgIntensity: 0,
        topEmotions: [] as {
          emotion: string;
          count: number;
          avg: number;
          tone: string;
        }[],
        lastMonthTopEmotions: [] as {
          emotion: string;
          count: number;
          avg: number;
          tone: string;
        }[],
        sessionsPerTreatment: [] as { treatment: string; count: number }[],
        lastMonthSessionsPerTreatment: [] as { treatment: string; count: number }[],
        peakTime: "N/A",
      };
    }

    const parsedRows = rows
      .filter((r) => !!r.message_created_at)
      .map((r) => ({
        ...r,
        date: new Date(r.message_created_at),
        monthKey: new Date(r.message_created_at).toISOString().slice(0, 7), // e.g. "2025-07"
      }));

    const now = new Date();
    const thisMonthKey = now.toISOString().slice(0, 7);
    const lastMonth = new Date(now);
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthKey = lastMonth.toISOString().slice(0, 7);

    const thisMonthRows = parsedRows.filter((r) => r.monthKey === thisMonthKey);
    const lastMonthRows = parsedRows.filter((r) => r.monthKey === lastMonthKey);

    const avg = (arr: EmotionTrainingRow[]) =>
      arr.length ? arr.reduce((sum, item) => sum + item.intensity, 0) / arr.length : 0;

    const countByEmotion = thisMonthRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.emotion] = (acc[row.emotion] || 0) + 1;
      return acc;
    }, {});

    const topEmotions = Object.entries(countByEmotion)
      .map(([emotion, count]) => {
        const filtered = thisMonthRows.filter((r) => r.emotion === emotion);
        const tone = filtered[0]?.tone || "neutral";
        return {
          emotion,
          count,
          avg: avg(filtered),
          tone,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const lastMonthCounts = lastMonthRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.emotion] = (acc[row.emotion] || 0) + 1;
      return acc;
    }, {});

    const lastMonthTopEmotions = Object.entries(lastMonthCounts)
      .map(([emotion, count]) => {
        const filtered = lastMonthRows.filter((r) => r.emotion === emotion);
        const tone = filtered[0]?.tone || "neutral";
        return {
          emotion,
          count,
          avg: avg(filtered),
          tone,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    const hourlyCounts = thisMonthRows.reduce<Record<string, number>>((acc, row) => {
      const key = `${row.date.toLocaleDateString()} ${row.date.getHours()}:00`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const [peakTime] = Object.entries(hourlyCounts).sort((a, b) => b[1] - a[1])[0] ?? ["N/A"];

    const sessionsPerTreatmentMap = thisMonthRows.reduce<Record<string, Set<string>>>(
      (acc, row) => {
        if (!row.treatment_name || !row.session_id) return acc;
        if (!acc[row.treatment_name]) acc[row.treatment_name] = new Set();
        acc[row.treatment_name].add(row.session_id);
        return acc;
      },
      {}
    );

    const lastMonthHourlyCounts = lastMonthRows.reduce<Record<string, number>>((acc, row) => {
      const key = `${row.date.toLocaleDateString()} ${row.date.getHours()}:00`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    const [lastMonthPeakTime] = Object.entries(lastMonthHourlyCounts).sort(
      (a, b) => b[1] - a[1]
    )[0] ?? ["N/A"];

    const sessionsPerTreatment = Object.entries(sessionsPerTreatmentMap)
      .map(([treatment, sessionSet]) => ({
        treatment,
        count: sessionSet.size,
      }))
      .sort((a, b) => b.count - a.count);

    const lastMonthSessionsMap = lastMonthRows.reduce<Record<string, Set<string>>>((acc, row) => {
      if (!row.treatment_name || !row.session_id) return acc;
      if (!acc[row.treatment_name]) acc[row.treatment_name] = new Set();
      acc[row.treatment_name].add(row.session_id);
      return acc;
    }, {});

    const lastMonthSessionsPerTreatment = Object.entries(lastMonthSessionsMap)
      .map(([treatment, set]) => ({
        treatment,
        count: set.size,
      }))
      .sort((a, b) => b.count - a.count);

    return {
      thisMonthCount: thisMonthRows.length,
      lastMonthCount: lastMonthRows.length,
      thisMonthAvgIntensity: avg(thisMonthRows),
      lastMonthAvgIntensity: avg(lastMonthRows),
      topEmotions,
      lastMonthTopEmotions,
      sessionsPerTreatment,
      lastMonthSessionsPerTreatment,
      peakTime,
      lastMonthPeakTime,
    };
  }, [rows]);

  const trend = (curr: number, prev: number) => (prev === 0 ? 100 : ((curr - prev) / prev) * 100);
  const trendColor = (val: number) =>
    val >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500";

  const toneColors: Record<string, string> = {
    positive: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    negative: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    neutral: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    default: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  };

  const treatmentColor = (count: number) =>
    count >= 10
      ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200"
      : count >= 5
        ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
        : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";

  const EmotionBadge = ({
    emotion,
    count,
    avg,
    tone,
  }: {
    emotion: string;
    count: number;
    avg: number;
    tone: string;
  }) => (
    <span
      className={`mb-1 mr-2 inline-flex items-center rounded-full border border-gray-300 px-2 py-0.5 text-xs font-medium dark:border-gray-600 ${
        toneColors[tone] || toneColors.default
      }`}
    >
      <strong className="mr-1">{emotion}</strong>
      <span className="text-gray-500 dark:text-gray-400">× {count}</span>
      <span className="ml-2 text-gray-400 dark:text-gray-300">(avg {avg.toFixed(2)})</span>
    </span>
  );

  const TreatmentBadge = ({ treatment, count }: { treatment: string; count: number }) => (
    <span
      className={`mb-1 mr-2 inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium dark:border-gray-600 ${treatmentColor(
        count
      )}`}
    >
      {treatment}
      <span className="ml-1 text-gray-500 dark:text-gray-400">× {count}</span>
    </span>
  );

  return (
    <div className="mb-4 mt-8 flex flex-col gap-2 rounded border p-4 text-sm">
      <h3 className="font-bold text-gray-900 dark:text-gray-100">Client Overview</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded bg-gray-50 p-2 dark:bg-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-300">Entries</div>
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {stats.thisMonthCount}
            <span
              className={`ml-2 text-xs ${trendColor(
                trend(stats.thisMonthCount, stats.lastMonthCount)
              )}`}
              title="Change from last month"
            >
              ({trend(stats.thisMonthCount, stats.lastMonthCount).toFixed(1)}%)
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Last month: {stats.lastMonthCount}
          </div>
        </div>

        <div className="rounded bg-gray-50 p-2 dark:bg-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-300">Peak Activity</div>
          <div className="text-gray-900 dark:text-gray-100">{stats.peakTime}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Last month: {stats.lastMonthPeakTime}
          </div>
        </div>

        {/* <div className="rounded bg-gray-50 p-2 dark:bg-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-300">Average Intensity</div>
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {stats.thisMonthAvgIntensity.toFixed(2)}
            <span
              className={`ml-2 text-xs ${trendColor(
                trend(stats.thisMonthAvgIntensity, stats.lastMonthAvgIntensity)
              )}`}
              title="Change from last month"
            >
              ({trend(stats.thisMonthAvgIntensity, stats.lastMonthAvgIntensity).toFixed(1)}%)
            </span>
          </div>
        </div> */}

        <div className="col-span-2 rounded bg-gray-50 p-2 dark:bg-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-300">Top Emotions This Month</div>
          <div className="mt-1 flex flex-wrap">
            {stats.topEmotions.map((e) => (
              <EmotionBadge key={e.emotion} {...e} />
            ))}
          </div>

          {stats.lastMonthTopEmotions.length > 0 && (
            <div className="mt-3">
              <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                Last Month's Top Emotions:
              </div>
              <div className="flex flex-wrap">
                {stats.lastMonthTopEmotions.map((e) => (
                  <EmotionBadge key={`last-${e.emotion}`} {...e} />
                ))}
              </div>
            </div>
          )}
        </div>

        {stats.sessionsPerTreatment.length > 0 && (
          <div className="col-span-2 rounded bg-gray-50 p-2 dark:bg-gray-700">
            {stats.sessionsPerTreatment && (
              <>
                {" "}
                <div className="text-sm text-gray-600 dark:text-gray-300">
                  This Month's Sessions per Treatment
                </div>
                <div className="mt-1 flex flex-wrap">
                  {stats.sessionsPerTreatment.map((t) => (
                    <TreatmentBadge
                      key={`this-${t.treatment}`}
                      treatment={t.treatment}
                      count={t.count}
                    />
                  ))}
                </div>
              </>
            )}
            {stats.lastMonthSessionsPerTreatment.length > 0 && (
              <div className="mt-3">
                <div className="mb-1 text-xs text-gray-500 dark:text-gray-400">
                  Last Month's Sessions per Treatment
                </div>
                <div className="mt-1 flex flex-wrap">
                  {stats.lastMonthSessionsPerTreatment.map((t) => (
                    <TreatmentBadge key={`last-${t.treatment}`} {...t} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
