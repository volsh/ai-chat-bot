"use client";

import { useState, useMemo } from "react";
import { useExportTraining } from "@/hooks/useExportTraining";
import MultiSelectFilter, { OptionType } from "@/components/ui/multiSelectChips";
import Slider from "@/components/ui/slider";
import DateRangePicker from "@/components/ui/dateRangePicker";
import { useSavedFilters } from "@/hooks/useSavedFilters";
import DayHourHeatmap from "./DayHourHeatmap";
import SummaryBox from "./SummaryBox";
import { AnnotationsConsistencyChart } from "./AnnotationsConsistencyChart";
import { ExportFilterOptions } from "@/types";
import ClientTrendSummary from "./ClientTrendSummary";
import CorrectedMessagesBox from "./CorrectedMessagesBox";
import FlaggedMessagesBox from "./FlaggedMessagesBox";
import HighRiskMessagesBox from "./HighRiskMessagesBox";
import ToneDistributionPie from "./ToneDistributionPie";
import EmotionDistributionPie from "./EmotionDistributionPie";
import IntensitiesDistributionsBar from "./IntensitiesDistributionsBar";
import IntensitiesDistributionsArea from "./IntensitiesDistributionsArea";
import AvgScoreBar from "./AvgScoreBar";
import IntensityOverTimeLine from "./IntensityOverTimeLine";
import Spinner from "../ui/spinner";
import { SessionReviewMetricsChart } from "./SessionReviewMetricsChart";
import { GoalAlignmentTrendChart } from "./GoalAlignmentChart";
import { SessionScoreTrendChart } from "./SessionScoreTrendChart";

export default function TharpistAnalyticsSection() {
  const [minEmotionFrequency, setMinEmotionFrequency] = useState(3);

  const { filters, setFilter } = useSavedFilters<ExportFilterOptions>(
    "therapist_analytics_filters",
    {
      emotions: [],
      intensity: [0.1, 1],
      tones: [],
      topics: [],
      alignment_score: [0.1, 1],
      minEmotionFrequency,
      highRiskOnly: false,
      startDate: "",
      endDate: "",
      scoreCutoff: 3,
      topN: 50,
      users: [],
      supportingTherapists: [],
    }
  );
  const { loading, previewRows, totalAnnotations } = useExportTraining(filters);

  const emotionSummary = useMemo(
    () =>
      previewRows.reduce((acc: Record<string, { count: number; totalScore: number }>, row: any) => {
        if (row.emotion) {
          const emotion = row.emotion;
          if (!acc[emotion]) acc[emotion] = { count: 0, totalScore: 0 };
          acc[emotion].count++;
          acc[emotion].totalScore += row.score || 0;
        }
        return acc;
      }, {}),
    [previewRows]
  );

  const filteredRows = useMemo(() => {
    return previewRows.filter(
      (row) => row.emotion && emotionSummary[row.emotion].count >= minEmotionFrequency
    );
  }, [previewRows, emotionSummary, minEmotionFrequency]);

  const allEmotions = useMemo(() => {
    return Array.from(
      new Set(previewRows.map((s) => s.emotion).filter(Boolean))
    ).sort() as string[];
  }, [previewRows]);

  const allTones = useMemo(() => {
    return Array.from(new Set(previewRows.map((s) => s.tone).filter(Boolean))).sort() as string[];
  }, [previewRows]);

  const allTopics = useMemo(() => {
    return Array.from(new Set(previewRows.map((s) => s.topic).filter(Boolean))).sort() as string[];
  }, [previewRows]);

  const allGoals = useMemo(() => {
    return Array.from(new Set(previewRows.map((s) => s.goal).filter(Boolean))).sort() as string[];
  }, [previewRows]);

  const allUsers = useMemo(() => {
    return Array.from(
      new Map(
        previewRows.map((s) => [
          s.user_id,
          { value: s.user_id, label: s.full_name || s.user_id } as OptionType,
        ])
      ).values()
    );
  }, [previewRows]);

  const allSupportingTherapists = useMemo(() => {
    const therapistMap = new Map();

    previewRows.forEach((row) => {
      row.supporting_therapists?.forEach((t) => {
        if (t?.id) {
          therapistMap.set(t.id, { value: t.id, label: t.name });
        }
      });
    });

    return Array.from(therapistMap.values());
  }, [previewRows]);

  if (loading) return <Spinner size={50} className="mt-8" />;

  return (
    <div className="mt-8">
      {/* Filters */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MultiSelectFilter
          label="Emotion"
          values={filters.emotions || []}
          onChange={(value) => setFilter("emotions", value)}
          options={allEmotions}
        />
        <MultiSelectFilter
          label="Tone"
          values={filters.tones || []}
          onChange={(value) => setFilter("tones", value)}
          options={allTones}
        />
        <MultiSelectFilter
          label="Topic"
          values={filters.topics || []}
          onChange={(value) => setFilter("topics", value)}
          options={allTopics}
        />
        <Slider
          type="range"
          label="Intensity"
          min={0.1}
          max={1}
          step={0.1}
          value={filters.intensity as [number, number]}
          onChange={(value) => setFilter("intensity", value)}
          useDebounce
        />
        <Slider
          type="range"
          label="Alignment with goal score"
          min={0.1}
          max={1}
          step={0.1}
          value={[filters.alignment_score?.[0] || 0.1, filters.alignment_score?.[1] || 1]}
          onChange={(value) => setFilter("alignment_score", value)}
          useDebounce
        />
        <Slider
          label="Score Cutoff Threshold"
          min={1}
          max={5}
          step={1}
          value={filters.scoreCutoff || 3}
          onChange={(value) => setFilter("scoreCutoff", value)}
          useDebounce
          tooltip={
            <>
              Only include entries with a score equal to or above this value.
              <ul className="mt-1 list-disc pl-5">
                <li>
                  <strong>5</strong> – Manually corrected, or alignment with goal ≥ <code>0.9</code>{" "}
                  and intensity ≥ <code>0.8</code>
                </li>
                <li>
                  <strong>4</strong> – Alignment with goal ≥ <code>0.9</code> and intensity ≥{" "}
                  <code>0.4</code>, or alignment with goal ≥ <code>0.7</code> and intensity ≥{" "}
                  <code>0.8</code>
                </li>
                <li>
                  <strong>3</strong> – Alignment with goal ≥ <code>0.6</code> and intensity ≥{" "}
                  <code>0.6</code>
                </li>
                <li>
                  <strong>2</strong> – Alignment with goal ≥ <code>0.4</code> and intensity ≥{" "}
                  <code>0.4</code>, or alignment with goal ≥ <code>0.2</code> or intensity ≥{" "}
                  <code>0.2</code>
                </li>
                <li>
                  <strong>1</strong> – Everything else (very weak signals)
                </li>
              </ul>
            </>
          }
          tooltipId="scoreCutoffTooltip"
        />
        <Slider
          label="Minimum Emotion Frequency"
          min={1}
          max={10}
          value={minEmotionFrequency}
          onChange={(val) => setMinEmotionFrequency(val)}
          useDebounce
        />
        <Slider
          label="Top N Annotations"
          min={1}
          max={totalAnnotations || 100}
          value={filters.topN || 50}
          onChange={(value) => setFilter("topN", value)}
          useDebounce
        />
        <DateRangePicker
          value={{ from: filters.startDate!, to: filters.endDate! }}
          onChange={(value) => {
            setFilter("startDate", value.from);
            setFilter("endDate", value.to);
          }}
        />
        <MultiSelectFilter
          label="Goals"
          values={filters.goals || []}
          onChange={(v) => setFilter("goals", v)}
          options={allGoals}
        />
        <MultiSelectFilter
          label="Role"
          options={["user", "assistant"]}
          values={filters.messageRole || []}
          onChange={(value) => setFilter("messageRole", value)}
        />
        <MultiSelectFilter
          label="Client"
          values={filters.users || []}
          onChange={(value) => setFilter("users", value)}
          options={allUsers}
        />
        <MultiSelectFilter
          label="Supporting Therapists"
          values={filters.supportingTherapists || []}
          onChange={(value) => setFilter("supportingTherapists", value)}
          options={allSupportingTherapists}
        />
      </div>

      {/* Charts */}
      <div className="mb-8">
        <h4 className="mb-2 font-semibold">📊 Analytics Overview</h4>

        {filters.users?.length === 1 ? (
          <div className="mt-8">
            <ClientTrendSummary rows={filteredRows} />
          </div>
        ) : (
          <SummaryBox rows={filteredRows} />
        )}
        <div className="mt-2 grid grid-cols-1 gap-8 sm:grid-cols-2">
          <EmotionDistributionPie rows={filteredRows} />
          <ToneDistributionPie rows={filteredRows} />
        </div>
        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
          <IntensitiesDistributionsBar rows={filteredRows} />
          <IntensitiesDistributionsArea rows={filteredRows} />
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <IntensityOverTimeLine rows={filteredRows} />
          <div className="min-w-0 overflow-x-auto">
            <DayHourHeatmap rows={filteredRows} title="Emotions Frequencies Time Slots" />
          </div>
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AnnotationsConsistencyChart rows={filteredRows} />
          <SessionReviewMetricsChart rows={filteredRows} pageSize={10} />
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SessionScoreTrendChart rows={filteredRows} />
          <AvgScoreBar rows={filteredRows} />
        </div>
        <div className="mt-8">
          <GoalAlignmentTrendChart rows={filteredRows} />
        </div>
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CorrectedMessagesBox rows={filteredRows} />
          <FlaggedMessagesBox rows={filteredRows} />
          <HighRiskMessagesBox rows={filteredRows} />
        </div>
      </div>
    </div>
  );
}
