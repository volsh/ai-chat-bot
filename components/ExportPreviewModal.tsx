import Modal from "@/components/ui/modal";
import Badge from "@/components/ui/badge";
import { EmotionTrainingRow } from "@/types";
// import { Bar } from "react-chartjs-2";
// import { Chart as ChartJS, BarElement, CategoryScale, LinearScale, Tooltip } from "chart.js";
import { useMemo, useState } from "react";
import clsx from "clsx";

// ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip);

interface ExportPreviewModalProps {
  entries: EmotionTrainingRow[];
  onClose: () => void;
  cutoff?: number;
  total?: number;
}

export default function ExportPreviewModal({
  entries,
  onClose,
  cutoff,
  total,
}: ExportPreviewModalProps) {
  // const [viewMode, setViewMode] = useState<"all" | "corrected" | "uncorrected">("all");

  // const filteredEntries = useMemo(() => {
  //   return entries.filter((e) =>
  //     viewMode === "all"
  //       ? true
  //       : viewMode === "corrected"
  //         ? !!e.annotation_updated_by
  //         : !e.annotation_updated_by
  //   );
  // }, [entries, viewMode]);

  const groupedByEmotion = useMemo(() => {
    const map: Record<string, EmotionTrainingRow[]> = {};
    entries.forEach((entry) => {
      const key = entry.emotion || "Other";
      if (!map[key]) map[key] = [];
      map[key].push(entry);
    });
    return map;
  }, [entries]);

  // const chartData = {
  //   labels: Object.keys(groupedByEmotion),
  //   datasets: [
  //     {
  //       label: "Visible Emotion Frequency",
  //       data: Object.values(groupedByEmotion).map((g) => g.length),
  //       backgroundColor: "rgba(99, 102, 241, 0.6)",
  //     },
  //   ],
  // };

  return (
    <Modal onClose={onClose}>
      <h2 className="mb-2 text-lg font-semibold">📄 Export Preview</h2>

      {cutoff !== undefined && total !== undefined && (
        <div className="mb-3 text-sm text-zinc-600 dark:text-zinc-400">
          Showing <strong>{entries.length}</strong> out of {total} entries (cutoff:{" "}
          <code>{cutoff.toFixed(2)}</code>)
        </div>
      )}

      {/* <div className="mb-3 flex gap-2 text-sm">
        {["all", "corrected", "uncorrected"].map((mode) => (
          <button
            key={mode}
            onClick={() => setViewMode(mode as any)}
            className={clsx(
              "rounded px-2 py-1",
              viewMode === mode
                ? "bg-blue-600 text-white"
                : "bg-zinc-200 dark:bg-zinc-700 dark:text-white"
            )}
          >
            {mode === "all" && "All"}
            {mode === "corrected" && "✔️ Corrected Only"}
            {mode === "uncorrected" && "❗ Uncorrected Only"}
          </button>
        ))}
      </div> */}

      <div className="max-h-[400px] space-y-4 overflow-y-auto text-sm">
        {Object.entries(groupedByEmotion).map(([emotion, group]) => (
          <details key={emotion} open className="rounded border p-2 dark:border-zinc-700">
            <summary className="cursor-pointer font-semibold">
              {emotion} ({group.length})
            </summary>
            <div className="mt-2 space-y-2">
              {group.map((entry, i) => (
                <div key={i} className="border-b pb-2 dark:border-zinc-700">
                  <p className="font-medium">
                    {entry.note ? (
                      <>
                        <strong>Note:</strong> {entry.note}
                      </>
                    ) : (
                      entry.content
                    )}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {entry.annotation_updated_by && <Badge variant="green">✔️ Corrected</Badge>}
                    {entry.tone && <Badge>{entry.tone}</Badge>}
                    {entry.intensity && <Badge>{entry.intensity}</Badge>}
                    {entry.topic && <Badge>{entry.topic}</Badge>}
                    {entry.score !== undefined && (
                      <Badge variant="outline">Score: {entry.score.toFixed(2)}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>
      {entries.length === 0 && (
        <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
          No entries match the selected filters.
        </div>
      )}
      {/* {filteredEntries.length > 0 && (
        <div className="mt-6 max-h-[300px]">
          <Bar data={chartData} />
        </div>
      )} */}

      <div className="mt-6 flex justify-end">
        <button
          onClick={onClose}
          className="rounded bg-zinc-100 px-4 py-2 text-sm hover:bg-zinc-200 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
