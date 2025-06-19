"use client";

import { useEffect, useState } from "react";
import Button from "@/components/ui/button";
import MultiSelect from "@/components/ui/multiselect";
import Slider from "@/components/ui/slider";
import Toggle from "@/components/ui/toggle";
import Input from "@/components/ui/input";
import SnapshotList from "@/components/therapist/SnapshotList";
import { emotions, tones, topics } from "@/utils/emotions/constants";
import { ExportFilterOptions, EmotionSummary, EmotionTrainingRow } from "@/types";
import { toast } from "react-hot-toast";
import ExportPreviewModal from "@/components/ExportPreviewModal";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from "chart.js";
import SnapshotCreatorModal from "@/components/therapist/SnapshotCreatorModal";
import ClearFiltersButton from "@/components/ui/filters/ClearFiltersButton";

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
  const [totalAnnotations, setTotalAnnotations] = useState(0);
  const [selectedCount, setSelectedCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewRows, setPreviewRows] = useState<EmotionTrainingRow[]>([]);
  const [summary, setSummary] = useState<EmotionSummary[]>([]);
  const [cutoff, setCutoff] = useState<number>(filters.scoreCutoff || 3);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [exportLocked, setExportLocked] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCreator, setShowCreator] = useState(false);

  useEffect(() => {
    localStorage.setItem("exportFilters", JSON.stringify(filters));
  }, [filters]);

  const fetchPreview = async () => {
    setLoading(true);
    const res = await fetch("/api/exports/export-fine-tune-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filters),
    });
    const json = await res.json();
    if (res.ok) {
      setTotalAnnotations(json.total);
      setSelectedCount(json.annotations.length);
      setPreviewRows(json.annotations);
      setSummary(json.summary);
      setCutoff(filters.scoreCutoff || 3);
      setTotalCount(json.total);
    } else {
      toast.error(json.error || "Failed to load preview");
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPreview();
  }, [filters]);

  const handleExport = async () => {
    setLoading(true);
    setFilePath(null);
    try {
      const res = await fetch("/api/exports/export-fine-tune", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filters),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Export failed");
      if (json.locked) {
        toast.error("Export temporarily locked. Please wait and try again.");
        setExportLocked(true);
        return;
      }
      setFilePath(json.filePath);
      toast.success("Export successful");
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

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
          <MultiSelect
            label="Emotion"
            options={emotions.map((e) => ({ label: e, value: e }))}
            value={(filters.emotions || []).map((e) => ({ label: e, value: e }))}
            onChange={(selected) =>
              setFilters((f) => ({ ...f, emotions: selected.map((o) => o.value) }))
            }
          />
          <MultiSelect
            label="Tone"
            options={tones.map((t) => ({ label: t, value: t }))}
            value={(filters.tones || []).map((t) => ({ label: t, value: t }))}
            onChange={(selected) =>
              setFilters((f) => ({ ...f, tones: selected.map((o) => o.value) }))
            }
          />
          <MultiSelect
            label="Topic"
            options={topics.map((t) => ({ label: t, value: t }))}
            value={(filters.topics || []).map((t) => ({ label: t, value: t }))}
            onChange={(selected) =>
              setFilters((f) => ({ ...f, topics: selected.map((o) => o.value) }))
            }
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
          <MultiSelect
            label="Role"
            options={["user", "assistant"].map((r) => ({ label: r, value: r }))}
            value={(filters.role || []).map((r) => ({ label: r, value: r }))}
            onChange={(selected) =>
              setFilters((f) => ({ ...f, role: selected.map((o) => o.value) }))
            }
          />
          <Input
            label="User ID"
            value={filters.userId || ""}
            onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
          />
          <Input
            label="Therapist ID"
            value={filters.therapistId || ""}
            onChange={(e) => setFilters((f) => ({ ...f, therapistId: e.target.value }))}
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
        <div className="badge text-zinc-700 dark:text-white">
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
        <Button onClick={handleExport} loading={loading || exportLocked}>
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
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-700 dark:text-white">🧐 Snapshots</h2>
          <Button size="sm" onClick={() => setShowCreator(true)}>
            ➕ Create Snapshot
          </Button>
        </div>
        <SnapshotList />
      </div>
      {showCreator && (
        <SnapshotCreatorModal
          filters={filters}
          onClose={() => setShowCreator(false)}
          onSuccess={fetchPreview}
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

      {summary.length > 0 && (
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
      )}
    </div>
  );
}
