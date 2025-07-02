import { EmotionTrainingRow } from "@/types";
import React, { useMemo } from "react";

function DayHourHeatmap({ rows, title }: { rows: EmotionTrainingRow[]; title?: string }) {
  const counts = useMemo(() => {
    const data = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => [] as EmotionTrainingRow[])
    );
    rows.forEach((row) => {
      const date = new Date(row.message_created_at);
      const day = date.getDay();
      const hour = date.getHours();
      data[day][hour].push(row);
    });
    return data;
  }, [rows]);

  const xLabels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
  const yLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const colorScale = [
    { range: "0", color: "#f9f9ff", label: "0 entries" },
    { range: "1–4", color: "#ff6384", label: "1–4 entries" },
    { range: "5+", color: "#c0392b", label: "5 or more entries" },
  ];
  const getColor = (count: number) => (count === 0 ? "#f9f9ff" : count < 5 ? "#ff6384" : "#c0392b");
  const currentHour = new Date().getHours();

  return (
    <div className="flex h-full w-full flex-col rounded border p-4">
      <h3 className="mb-2 font-semibold">{title || "Time of Day / Day of Week Heatmap"}</h3>
      {rows.length === 0 ? (
        <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
          No data available.
        </div>
      ) : (
        <div className="relative w-full flex-1 overflow-x-auto">
          <div className="h-full min-w-max">
            {/* Header */}
            <div className="flex">
              <div className="w-16 flex-shrink-0 sm:w-20" />
              {xLabels.map((label) => (
                <div
                  key={label}
                  className="flex-1 text-center text-[9px] font-medium sm:text-[10px]"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Day Rows */}
            {yLabels.map((dayLabel, dayIndex) => (
              <div key={dayLabel} className="flex">
                <div className="flex w-16 flex-shrink-0 items-center justify-end pr-1 text-[9px] font-medium sm:w-20 sm:pr-2 sm:text-[11px]">
                  {dayLabel}
                </div>
                {counts[dayIndex]?.map((slotRows, hour) => {
                  const count = slotRows.length;

                  // Build tooltip data
                  const emotions = slotRows.reduce(
                    (acc: Record<string, number>, row) => {
                      const emotion = row.emotion || "unknown";
                      acc[emotion] = (acc[emotion] || 0) + 1;
                      return acc;
                    },
                    {} as Record<string, number>
                  );

                  return (
                    <div
                      key={`${dayIndex}_${hour}`}
                      style={{ backgroundColor: getColor(count) }}
                      className={`group relative flex h-[24px] min-w-[24px] flex-1 cursor-pointer items-center justify-center border text-[9px] text-gray-800 dark:text-gray-100 sm:h-[30px] sm:min-w-[30px] sm:text-[10px] ${hour >= 9 && hour < 17 ? "bg-gray-100 dark:bg-gray-700" : ""} ${hour === currentHour ? "outline outline-1 outline-blue-500" : ""} `}
                    >
                      {count || ""}
                      {count > 0 && (
                        <div className="pointer-events-none invisible absolute left-1/2 top-full z-50 mt-1 w-40 -translate-x-1/2 rounded bg-gray-800 p-2 text-[9px] text-white shadow-lg group-hover:visible sm:text-[10px]">
                          <div className="font-bold">{dayLabel}</div>
                          <div>
                            Hour: {hour}:00 ({count} entries)
                          </div>
                          <div className="mt-1 space-y-0.5">
                            {Object.entries(emotions).map(([emotion, cnt]) => (
                              <div key={emotion}>
                                {emotion}: {cnt}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3 text-[9px] text-gray-600 dark:text-gray-300 sm:text-[10px]">
        {colorScale.map((item) => (
          <div key={item.range} className="flex items-center gap-1">
            <span
              className="h-2 w-2 rounded sm:h-3 sm:w-3"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </div>
        ))}
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded outline outline-1 outline-blue-500 sm:h-3 sm:w-3" />
          Current Hour
        </div>
        <div className="flex items-center gap-1">
          <span className="h-2 w-2 rounded bg-gray-100 dark:bg-gray-700 sm:h-3 sm:w-3" />
          Business Hours
        </div>
      </div>
    </div>
  );
}

export default DayHourHeatmap;
