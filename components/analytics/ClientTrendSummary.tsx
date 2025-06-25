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
        thisMonthCommonEmotion: "N/A",
        lastMonthCommonEmotion: "N/A",
        peakTime: "N/A",
      };
    }

    const parsedRows = rows.map((r) => ({ ...r, date: new Date(r.tagged_at) }));

    const now = new Date();
    const thisMonthRows = parsedRows.filter(
      (r) => r.date.getMonth() === now.getMonth() && r.date.getFullYear() === now.getFullYear()
    );
    const lastMonthRows = parsedRows.filter((r) => {
      const lm = new Date(now);
      lm.setMonth(now.getMonth() - 1);
      return r.date.getMonth() === lm.getMonth() && r.date.getFullYear() === lm.getFullYear();
    });

    const avg = (arr: any[]) =>
      arr.length ? arr.reduce((sum, item) => sum + item.intensity, 0) / arr.length : 0;

    const mode = (arr: any[]) =>
      arr.length
        ? Object.entries(
            arr.reduce((count: Record<string, number>, item) => {
              count[item.emotion] = (count[item.emotion] || 0) + 1;
              return count;
            }, {})
          ).sort((a, b) => b[1] - a[1])[0]?.[0]
        : "N/A";

    const hourlyCounts = thisMonthRows.reduce<Record<string, number>>((acc, row) => {
      const key = `${row.date.toLocaleDateString()} ${row.date.getHours()}:00`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const [peakTime] = Object.entries(hourlyCounts).sort((a, b) => b[1] - a[1])[0] ?? ["N/A"];

    return {
      thisMonthCount: thisMonthRows.length,
      lastMonthCount: lastMonthRows.length,
      thisMonthAvgIntensity: avg(thisMonthRows),
      lastMonthAvgIntensity: avg(lastMonthRows),
      thisMonthCommonEmotion: mode(thisMonthRows),
      lastMonthCommonEmotion: mode(lastMonthRows),
      peakTime,
    };
  }, [rows]);

  const trend = (curr: number, prev: number) => (prev === 0 ? 100 : ((curr - prev) / prev) * 100);

  const trendColor = (val: number) =>
    val >= 0 ? "text-emerald-600 dark:text-emerald-500" : "text-red-600 dark:text-red-500";

  return (
    <div className="mb-4 mt-8 flex flex-col gap-2 rounded border p-4 text-sm">
      <h3 className="font-bold text-gray-900 dark:text-gray-100">Client Overview</h3>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded bg-gray-50 p-2 dark:bg-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-300">Entries</div>
          <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
            {stats.thisMonthCount}
            <span
              className={`ml-2 text-xs ${trendColor(trend(stats.thisMonthCount, stats.lastMonthCount))}`}
              title="Change from last month"
            >
              ({trend(stats.thisMonthCount, stats.lastMonthCount).toFixed(1)}%)
            </span>
          </div>
        </div>

        <div className="rounded bg-gray-50 p-2 dark:bg-gray-700">
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
        </div>

        <div className="rounded bg-gray-50 p-2 dark:bg-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-300">Most Common Emotion</div>
          <div className="text-gray-900 dark:text-gray-100">
            {stats.thisMonthCommonEmotion ?? "N/A"}
            {stats.lastMonthCommonEmotion &&
              stats.thisMonthCommonEmotion !== stats.lastMonthCommonEmotion && (
                <span className="ml-1 text-[10px] text-gray-500 dark:text-gray-400">
                  (was {stats.lastMonthCommonEmotion})
                </span>
              )}
          </div>
        </div>

        <div className="rounded bg-gray-50 p-2 dark:bg-gray-700">
          <div className="text-sm text-gray-600 dark:text-gray-300">Peak Activity</div>
          <div className="text-gray-900 dark:text-gray-100">{stats.peakTime}</div>
        </div>
      </div>
    </div>
  );
}
