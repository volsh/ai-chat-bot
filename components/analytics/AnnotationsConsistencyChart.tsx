import { EmotionTrainingRow } from "@/types";
import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  Tooltip,
  LabelList,
  CartesianGrid,
  ComposedChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import Select from "@/components/ui/select";

export function AnnotationsConsistencyChart({ rows }: { rows: EmotionTrainingRow[] }) {
  const [chartType, setChartType] = useState<"overall" | "session">("overall");
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredLabel, setHoveredLabel] = useState<{ title: string; x: number; y: number } | null>(
    null
  );
  const [treatmentPage, setTreatmentPage] = useState(0);
  const TREATMENTS_PER_PAGE = 1;

  const metricsData = useMemo(() => {
    const metrics = [
      { key: "emotion", original: "original_emotion" },
      { key: "tone", original: "original_tone" },
      { key: "intensity", original: "original_intensity" },
      { key: "topic", original: "original_topic" },
    ] as const;

    return metrics.map((metric) => {
      const total = rows.length;
      const corrections = rows.filter((r) => r[metric.original] !== r[metric.key]).length;

      return {
        metric: metric.key,
        Corrected: corrections,
        Unchanged: total - corrections,
      };
    });
  }, [rows]);

  const groupedByTreatment = useMemo(() => {
    const grouped: Record<string, { treatmentTitle: string; sessions: any[] }> = {};

    const sessions = rows.reduce<Record<string, EmotionTrainingRow[]>>((acc, row) => {
      if (!row.session_id) return acc;
      if (!acc[row.session_id]) acc[row.session_id] = [];
      acc[row.session_id].push(row);
      return acc;
    }, {});

    Object.entries(sessions).forEach(([sessionId, sessionRows]) => {
      const firstRow = sessionRows[0];
      const treatmentKey = firstRow.treatment_id || "unknown";
      const treatmentTitle = firstRow.treatment_name || "Untitled Treatment";

      const total = sessionRows.length;
      const agreed = sessionRows.filter(
        (r) =>
          (!r.original_emotion || r.original_emotion === r.emotion) &&
          (!r.original_intensity || Number(r.original_intensity) === Number(r.intensity)) &&
          (!r.original_tone || r.original_tone === r.tone) &&
          (!r.original_topic || r.original_topic === r.topic)
      ).length;

      const correctionCounts = {
        emotion: sessionRows.filter((r) => r.original_emotion && r.original_emotion !== r.emotion)
          .length,
        tone: sessionRows.filter((r) => r.original_tone && r.original_tone !== r.tone).length,
        intensity: sessionRows.filter(
          (r) =>
            typeof r.original_intensity === "number" &&
            Number(r.original_intensity) !== Number(r.intensity)
        ).length,
        topic: sessionRows.filter((r) => r.original_topic && r.original_topic !== r.topic).length,
      };

      const sessionData = {
        sessionId,
        title: firstRow.session_title || sessionId,
        treatment: firstRow.treatment_name,
        agreementPercent: (agreed / total) * 100,
        corrections: correctionCounts,
        session_created_at: firstRow.session_created_at || 0,
      };

      if (!grouped[treatmentKey]) grouped[treatmentKey] = { treatmentTitle, sessions: [] };
      grouped[treatmentKey].sessions.push(sessionData);
    });

    Object.values(grouped).forEach((group) => {
      group.sessions.sort(
        (a, b) =>
          new Date(a.session_created_at).getTime() - new Date(b.session_created_at).getTime()
      );
    });

    return grouped;
  }, [rows]);

  const filteredTreatments = useMemo(() => {
    return Object.entries(groupedByTreatment)
      .map(([treatmentId, group]) => ({
        treatmentId,
        treatmentTitle: group.treatmentTitle,
        sessions: group.sessions.filter(
          (s) =>
            s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            s.treatment.toLowerCase().includes(searchQuery.toLowerCase())
        ),
      }))
      .filter((t) => t.sessions.length > 0);
  }, [groupedByTreatment, searchQuery]);

  const totalPages = Math.ceil(filteredTreatments.length / TREATMENTS_PER_PAGE);
  const paginatedTreatments = filteredTreatments.slice(
    treatmentPage * TREATMENTS_PER_PAGE,
    (treatmentPage + 1) * TREATMENTS_PER_PAGE
  );

  return (
    <div className="rounded border p-4">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center gap-2 font-semibold">
          AI/Annotation Consistency
          <span
            title="Displays AI vs therapist agreement percentages across sessions or metrics."
            className="cursor-help text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            📊
          </span>
        </h4>
        <Select
          value={chartType}
          onChange={(e) => setChartType(e.target.value as any)}
          options={[
            { value: "overall", label: "Overall Metrics" },
            { value: "session", label: "By Session" },
          ]}
        />
      </div>

      {chartType === "overall" ? (
        <ResponsiveContainer height={300} className="mt-4">
          <BarChart data={metricsData}>
            <XAxis dataKey="metric" />
            <YAxis />
            <Tooltip formatter={(value) => `${value}`} />
            <Legend />
            <Bar dataKey="Corrected" fill="#e74c3c">
              <LabelList dataKey="Corrected" position="top" fontSize={10} />
            </Bar>
            <Bar dataKey="Unchanged" fill="#2ecc71">
              <LabelList dataKey="Unchanged" position="top" fontSize={10} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <>
          <div className="mt-2 flex justify-end">
            <input
              type="text"
              placeholder="Search by Session or Treatment..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setTreatmentPage(0);
              }}
              className="rounded border px-2 py-1 text-xs text-gray-800 dark:border-gray-600 dark:text-gray-100"
            />
          </div>

          {paginatedTreatments.map(({ treatmentId, treatmentTitle, sessions }) => (
            <div key={treatmentId} className="mt-6">
              <div className="mb-1 border-b border-gray-300 pb-1 text-xs font-semibold text-gray-700 dark:text-gray-300">
                {treatmentTitle}
              </div>
              <ResponsiveContainer height={300}>
                <ComposedChart data={sessions}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="title" interval={0} tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip
                    formatter={(value) => `${Number(value).toFixed(1)}%`}
                    labelFormatter={(label, payload) => {
                      const entry = payload?.[0]?.payload as {
                        corrections: Record<string, number>;
                      };
                      if (!entry) return label;
                      const correctionText = Object.entries(entry.corrections)
                        .filter(([, count]) => count > 0)
                        .map(([key, count]) => `${key}: ${count}`)
                        .join(", ");
                      return correctionText
                        ? `Corrections — ${correctionText}`
                        : "No corrections made";
                    }}
                  />
                  <Bar
                    dataKey="agreementPercent"
                    fill="#2ecc71"
                    onClick={(data) => {
                      window.location.href = `/chat/${data.sessionId}`;
                    }}
                    cursor="pointer"
                    name="Agreement Percent"
                  >
                    <LabelList
                      dataKey="agreementPercent"
                      position="top"
                      formatter={(val: number) => `${val.toFixed(1)}%`}
                      style={{ fontSize: "10px", fill: "#111" }}
                    />
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          ))}

          {totalPages > 1 && (
            <div className="mt-3 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setTreatmentPage((prev) => Math.max(prev - 1, 0))}
                disabled={treatmentPage === 0}
                className="rounded border px-2 py-1 disabled:opacity-50"
              >
                Prev
              </button>
              <span>
                Page {treatmentPage + 1} of {totalPages}
              </span>
              <button
                onClick={() => setTreatmentPage((prev) => Math.min(prev + 1, totalPages - 1))}
                disabled={treatmentPage >= totalPages - 1}
                className="rounded border px-2 py-1 disabled:opacity-50"
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
