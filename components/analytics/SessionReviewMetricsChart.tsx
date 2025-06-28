import { EmotionTrainingRow } from "@/types";
import { title } from "process";
import { useMemo, useState, useRef } from "react";
import {
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  LabelList,
  CartesianGrid,
  Line,
  ComposedChart,
} from "recharts";

export function SessionReviewMetricsChart({
  rows,
  pageSize = 10,
}: {
  rows: EmotionTrainingRow[];
  pageSize: number;
}) {
  const [loading, setLoading] = useState(rows.length > 0);
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [hoveredLabel, setHoveredLabel] = useState<{ title: string; x: number; y: number } | null>(
    null
  );
  const containerRef = useRef<HTMLDivElement | null>(null);

  const data = useMemo(() => {
    if (!rows.length) return [];
    const grouped = rows.reduce<
      Record<string, { title: string; user: string; rows: EmotionTrainingRow[] }>
    >((acc, row) => {
      if (!row.session_id) return acc;
      if (!acc[row.session_id]) {
        acc[row.session_id] = {
          title: row.session_title || row.session_id,
          user: row.full_name || row.user_id || "Unknown user",
          rows: [],
        };
      }
      acc[row.session_id].rows.push(row);
      return acc;
    }, {});

    return Object.entries(grouped).map(([sessionId, { title, user, rows }]) => {
      const total = rows.length;

      const agreed = rows.filter((r) => {
        return (
          (!r.original_emotion || r.original_emotion === r.emotion) &&
          (!r.original_intensity || Number(r.original_intensity) === Number(r.intensity)) &&
          (!r.original_tone || r.original_tone === r.tone) &&
          (!r.original_topic || r.original_topic === r.topic)
        );
      }).length;

      return {
        sessionId,
        title,
        user,
        agreementPercent: (agreed / total) * 100,
      };
    });
  }, [rows]);

  const filteredData = useMemo(() => {
    if (!searchQuery) return data;
    return data.filter(
      (d) =>
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.user.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [data, searchQuery]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const pageData = filteredData.slice(page * pageSize, (page + 1) * pageSize);
  const trendData = pageData.map((d, i) => ({
    index: i,
    agreementPercent: d.agreementPercent,
    title: d.title,
    user: d.title,
    sessionId: d.sessionId,
  }));

  return (
    <div ref={containerRef} className="relative rounded border p-4 text-sm">
      <h4 className="flex items-center gap-2 font-semibold">
        AI/Annotation Consistency by Session
        <span
          title="Displays AI vs therapist agreement percentages across sessions"
          className="cursor-help text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
        >
          📊
        </span>
      </h4>
      {loading && (
        <div className="absolute left-1/2 top-1/2 flex h-[300px] -translate-y-1/2 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-gray-500" />
        </div>
      )}
      {rows.length === 0 && (
        <div className="flex h-[300px] items-center justify-center text-sm text-gray-500">
          No data available.
        </div>
      )}
      {pageData.length > 0 && (
        <>
          <div className="mt-2 flex justify-end">
            <input
              type="text"
              placeholder="Search by Session or User..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(0);
              }}
              className="rounded border px-2 py-1 text-xs text-gray-800 dark:border-gray-600 dark:text-gray-100"
            />
          </div>

          <ResponsiveContainer height={300}>
            <ComposedChart data={pageData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="title"
                interval={0}
                tick={(props) => {
                  const { x, y, payload } = props;
                  const value = payload.value as string;

                  return (
                    <g
                      transform={`translate(${x},${y + 15})`}
                      onMouseEnter={(e) => {
                        if (value.length > 30) {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const containerRect = containerRef.current?.getBoundingClientRect();
                          if (!containerRect) return;

                          setHoveredLabel({
                            title: value,
                            x: rect.left - containerRect.left + rect.width / 2,
                            y: rect.top - containerRect.top,
                          });
                        }
                      }}
                      onMouseLeave={() => {
                        setHoveredLabel(null);
                      }}
                      style={{ cursor: value.length > 30 ? "help" : "default" }}
                    >
                      <text textAnchor="middle" fontSize={10} fill="#111">
                        {value.length > 30 ? value.slice(0, 30) + "…" : value}
                      </text>
                    </g>
                  );
                }}
              />

              <YAxis domain={[0, 100]} />

              <Tooltip
                formatter={(value) => `${Number(value).toFixed(1)}%`}
                labelFormatter={(label, payload) => {
                  const entry = payload?.[0]?.payload as { title: string; user: string };
                  if (!entry) return label;

                  return entry?.title?.length > 30
                    ? `${entry?.title?.slice(0, 30)}… (${entry?.user})`
                    : `${entry?.title} (${entry?.user})`;
                }}
              />

              <Bar
                dataKey="agreementPercent"
                fill="#2ecc71"
                onAnimationEnd={() => setLoading(false)}
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

              <Line
                data={trendData}
                dataKey="agreementPercent"
                stroke="#8884d8"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
                name="Trend"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </>
      )}
      {/* ⚡️ Absolute Hovered Label */}
      {hoveredLabel && (
        <div
          style={{
            position: "absolute",
            left: hoveredLabel.x,
            top: hoveredLabel.y - 30,
            transform: "translate(-50%, -100%)",
            pointerEvents: "none",
            maxWidth: "250px",
            fontSize: "10px",
            background: "#111",
            color: "#fff",
            padding: "4px",
            borderRadius: "4px",
            textAlign: "center",
            zIndex: 10,
            whiteSpace: "normal",
            wordBreak: "break-word",
            boxShadow: "0px 2px 5px rgba(0,0,0,0.3)",
          }}
        >
          {hoveredLabel.title}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-3 flex items-center justify-end gap-2 text-xs">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 0))}
            disabled={page === 0}
            className="rounded border px-2 py-1 disabled:opacity-50"
          >
            Prev
          </button>
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
            disabled={page >= totalPages - 1}
            className="rounded border px-2 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
