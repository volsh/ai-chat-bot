"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/button";
import MultiSelectFilter, { OptionType } from "@/components/ui/multiSelectChips";
import Slider from "@/components/ui/slider";
import Toggle from "@/components/ui/toggle";
import SnapshotList from "@/components/therapist/SnapshotList";
import { ExportFilterOptions } from "@/types";
import ExportPreviewModal from "@/components/ExportPreviewModal";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from "chart.js";
import SnapshotCreatorModal from "@/components/therapist/SnapshotCreatorModal";
import ClearFiltersButton from "@/components/ui/filters/ClearFiltersButton";
import { useExportTraining } from "@/hooks/useExportTraining";
import { format } from "date-fns";
import FineTuneEventLog from "./events";
import RetryFailedJobs from "./retry-failed";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const defaultFilters = { topN: 50, scoreCutoff: 3, includeCorrected: false };

export default function ExportTrainingScreen() {
  const [filters, setFilters] = useState<ExportFilterOptions>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("exportFilters");
      return stored ? JSON.parse(stored) : defaultFilters;
    }
    return defaultFilters;
  });

  const [showPreview, setShowPreview] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCreator, setShowCreator] = useState(false);
  const [name, setName] = useState("Snapshot – " + format(new Date(), "PPpp"));

  const {
    fetchPreview,
    loading,
    filePath,
    exportLocked,
    previewRows,
    cutoff,
    totalCount,
    totalAnnotations,
    selectedCount,
  } = useExportTraining(filters);

  useEffect(() => {
    localStorage.setItem("exportFilters", JSON.stringify(filters));
  }, [filters]);

  return (
    <div className="p-6">
      <button
        className="mb-4 text-sm text-blue-600 underline"
        onClick={() => setShowAdvanced((s) => !s)}
      >
        {showAdvanced ? "Hide Advanced Filters" : "Show Advanced Filters"}
      </button>

      {showAdvanced && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MultiSelectFilter
            label="Emotion"
            options={[...new Set(previewRows.flatMap((s) => s.emotion || []))].map((e) => ({
              label: e,
              value: e,
            }))}
            values={filters.emotions || []}
            onChange={(selected) => setFilters((f) => ({ ...f, emotions: selected }))}
          />
          <MultiSelectFilter
            label="Tone"
            options={[...new Set(previewRows.flatMap((s) => s.tone || []))].map((e) => ({
              label: e,
              value: e,
            }))}
            values={filters.tones || []}
            onChange={(selected) => setFilters((f) => ({ ...f, tones: selected }))}
          />
          <MultiSelectFilter
            label="Topic"
            options={[...new Set(previewRows.flatMap((s) => s.topic || []))]}
            values={filters.topics || []}
            onChange={(selected) => setFilters((f) => ({ ...f, topics: selected }))}
          />
          <Slider
            type="range"
            label="Intensity"
            min={0.1}
            max={1}
            step={0.1}
            value={[filters.intensity?.[0] || 0.1, filters.intensity?.[1] || 1]}
            onChange={(value: [number, number]) =>
              setFilters((f) => ({ ...f, intensity: [value[0], value[1]] }))
            }
          />
          <MultiSelectFilter
            label="Role"
            options={["user", "assistant"]}
            values={filters.messageRole || []}
            onChange={(selected) => setFilters((f) => ({ ...f, messageRole: selected }))}
          />
          <MultiSelectFilter
            label="User"
            values={filters.users || []}
            onChange={(selected) => setFilters((f) => ({ ...f, users: selected }))}
            options={Array.from(
              new Map(
                previewRows.map((s) => [
                  s.user_id,
                  { value: s.user_id, label: s.full_name } as OptionType,
                ])
              ).values()
            )}
          />
          <MultiSelectFilter
            label="Therapist"
            values={filters.therapists || []}
            onChange={(selected) => setFilters((f) => ({ ...f, therapists: selected }))}
            options={Array.from(
              new Map(
                previewRows.map((s) => [
                  s.annotation_updated_by,
                  { value: s.user_id, label: s.therapist_name } as OptionType,
                ])
              ).values()
            )}
          />
          <div className="flex gap-5">
            <Toggle
              label="Include Corrected Only"
              checked={filters.includeCorrected || false}
              onChange={(checked) => setFilters((f) => ({ ...f, includeCorrected: checked }))}
            />
            <Toggle
              label="High Risk Only"
              checked={filters.highRiskOnly || false}
              onChange={(checked) => setFilters((f) => ({ ...f, highRiskOnly: checked }))}
            />
          </div>
          <Slider
            label="Top N Annotations"
            min={1}
            max={totalAnnotations || 100}
            value={filters.topN || 50}
            onChange={(value) => setFilters((f) => ({ ...f, topN: value }))}
          />

          <Slider
            label="Score Cutoff Threshold"
            min={1}
            max={5}
            step={1}
            value={filters.scoreCutoff || 3}
            onChange={(value) => setFilters((f) => ({ ...f, scoreCutoff: value }))}
            tooltip={
              <>
                Only include entries with a score equal to or above this value.
                <ul className="mt-1 list-disc pl-5">
                  <li>
                    <strong>5</strong> – Manually corrected
                  </li>
                  <li>
                    <strong>4</strong> – High intensity (≥ 0.85)
                  </li>
                  <li>
                    <strong>3</strong> – Moderate intensity (≥ 0.6)
                  </li>
                  <li>
                    <strong>2</strong> – Low intensity (≥ 0.3)
                  </li>
                  <li>
                    <strong>1</strong> – Very low intensity (&lt; 0.3)
                  </li>
                </ul>
              </>
            }
            tooltipId="scoreCutoffTooltip"
          />
        </div>
      )}
      <div className="mt-5 flex justify-between">
        <div className="badge">
          Selected {selectedCount} out of {totalAnnotations}
        </div>
        {showAdvanced && <ClearFiltersButton onClick={() => setFilters(defaultFilters)} />}
      </div>
      {exportLocked && (
        <div className="mt-4 rounded bg-red-100 p-2 text-sm text-red-800">
          A training export is already in progress. Please wait before retrying.
        </div>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <Button onClick={() => setShowPreview(true)} variant="secondary">
          👁️ Preview Selection
        </Button>
        <Button onClick={() => setShowCreator(true)} loading={loading || exportLocked}>
          ⬆️ Upload to OpenAI
        </Button>
        {filePath && (
          <div className="text-sm text-zinc-500">
            📁 Exported to: <code>{filePath}</code>
            <span
              className="ml-2 cursor-help text-xs text-zinc-400"
              title="Path relative to Supabase Storage or backend output"
            >
              ⓘ
            </span>
          </div>
        )}
      </div>

      <div className="mt-8">
        {/* <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">🧐 Snapshots</h2>
          <Button size="sm" onClick={() => setShowCreator(true)}>
            ➕ Create Snapshot
          </Button>
        </div> */}
        <SnapshotList />
      </div>
      {showCreator && (
        <SnapshotCreatorModal
          filters={filters}
          onClose={() => setShowCreator(false)}
          onSuccess={fetchPreview}
          snapshotName={name}
          setSnpashotName={setName}
        />
      )}

      {showPreview && (
        <ExportPreviewModal
          entries={previewRows}
          cutoff={cutoff}
          total={totalCount}
          onClose={() => setShowPreview(false)}
        />
      )}

      <FineTuneEventLog />
      <RetryFailedJobs />
      {/* {summary.length > 0 && (
        <div className="mt-6 max-w-xl">
          <h3 className="mb-2 font-semibold">📊 Score by Emotion</h3>
          <Bar
            data={{
              labels: summary.map((e) => e.emotion),
              datasets: [
                {
                  label: "Avg Annotation Score",
                  data: summary.map((e) => e.averageScore),
                  backgroundColor: "rgba(99, 102, 241, 0.6)",
                },
              ],
            }}
            options={{
              scales: {
                y: { min: 1, max: 5 },
              },
            }}
          />
        </div>
      )} */}
    </div>
  );
}
