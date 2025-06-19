// PATCHED: TherapistDashboard with emotion histogram (stacked bar + tooltip)

"use client";

import { useEffect, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { useAppStore } from "@/state";
import { Session } from "@/types";
import Input from "@/components/ui/input";
import { Bar } from "react-chartjs-2";
import { Chart, BarElement, CategoryScale, LinearScale } from "chart.js";
import Select from "@/components/ui/select";
import MultiSelectFilter from "@/components/ui/multiSelectChips";
import { Tooltip } from "react-tooltip";
import Link from "next/link";
import { updateSessionReviewedStatus } from "@/utils/chat/updateSessionReviewedStatus";
import { CheckSquare, Square } from "lucide-react";
import Tabs from "@/components/ui/tabs";
import { getEmotionColor, severityEmojiMap } from "@/utils/emotions/constants";
import { useShallow } from "zustand/react/shallow";
import getSeverityBreakdown from "@/utils/analytics/getSeverityBreakdown";

Chart.register(BarElement, CategoryScale, LinearScale);

interface DashboardSession extends Session {
  client_email: string;
  annotation_count: number;
  reviewed: boolean;
  summary?: string;
  severity_counts: {
    low: number;
    medium: number;
    high: number;
  };
  top_emotions?: string[];
  top_reasons?: string[];
  folder_name?: string;
}

const PAGE_SIZE = 20;

export default function TherapistDashboard() {
  const { userProfile, loadingProfile } = useAppStore(
    useShallow((s) => ({
      userProfile: s.userProfile,
      loadingProfile: s.loadingProfile,
    }))
  );
  const [sessions, setSessions] = useState<DashboardSession[]>([]);
  const [loading, setLoading] = useState(loadingProfile);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [emotionFilter, setEmotionFilter] = useState<string[]>([]);
  const [reasonFilter, setReasonFilter] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [tab, setTab] = useState("all");

  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile) return;

      const { data } = await supabase.rpc("list_therapist_sessions_with_flags", {
        therapist_id: userProfile.id,
      });

      setSessions((data as DashboardSession[]) || []);
      setLoading(false);
    };

    fetchData();
  }, [userProfile]);

  if (loading || loadingProfile)
    return <p className="mt-20 text-center text-gray-400">Loading shared sessions…</p>;

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const bulkSetReviewed = async (reviewed: boolean) => {
    await updateSessionReviewedStatus(selectedIds, reviewed);
    setSessions((prev) => prev.map((s) => (selectedIds.includes(s.id) ? { ...s, reviewed } : s)));
    setSelectedIds([]);
  };

  const filtered = sessions
    .filter((s) => {
      if (tab === "reviewed" && !s.reviewed) return false;
      if (tab === "unreviewed" && s.reviewed) return false;
      if (tab === "flagged" && s.annotation_count === 0) return false;
      return (
        s.client_email.toLowerCase().includes(search.toLowerCase()) &&
        (emotionFilter.length === 0 ||
          (s.top_emotions || []).some((e) => emotionFilter.includes(e))) &&
        (reasonFilter.length === 0 || (s.top_reasons || []).some((r) => reasonFilter.includes(r)))
      );
    })
    .sort((a, b) =>
      sort === "flags"
        ? b.annotation_count - a.annotation_count
        : +new Date(b.created_at) - +new Date(a.created_at)
    );

  const grouped = filtered.reduce(
    (acc, session) => {
      const groupKey = session.goal || session.folder_name || "Ungrouped";
      acc[groupKey] = [...(acc[groupKey] || []), session];
      return acc;
    },
    {} as Record<string, DashboardSession[]>
  );

  const paged = Object.entries(grouped).map(([group, list]) => [
    group,
    list.slice(0, PAGE_SIZE * page),
  ]);

  return (
    <div>
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { value: "all", label: "All Sessions" },
          { value: "reviewed", label: "Reviewed" },
          { value: "unreviewed", label: "Unreviewed" },
          { value: "flagged", label: "Flagged Only" },
        ]}
      />

      <div className="mb-4 flex flex-wrap gap-4">
        <Input
          placeholder="Filter by client email..."
          className="w-72"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          label="Sort By"
          className="w-48 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          options={[
            { label: "Newest First", value: "newest" },
            { label: "Most Flags", value: "flags" },
          ]}
        />
        <MultiSelectFilter
          label="Emotion"
          values={emotionFilter}
          options={[...new Set(sessions.flatMap((s) => s.top_emotions || []))]}
          onChange={setEmotionFilter}
        />
        <MultiSelectFilter
          label="Flag Reason"
          values={reasonFilter}
          options={[...new Set(sessions.flatMap((s) => s.top_reasons || []))]}
          onChange={setReasonFilter}
        />
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded border bg-zinc-100 p-2 text-sm dark:bg-zinc-800">
          <span>{selectedIds.length} selected</span>
          <div className="flex gap-2">
            <button
              className="rounded bg-green-600 px-2 py-1 text-white"
              onClick={() => bulkSetReviewed(true)}
            >
              Mark Reviewed
            </button>
            <button
              className="rounded bg-yellow-600 px-2 py-1 text-white"
              onClick={() => bulkSetReviewed(false)}
            >
              Mark Unreviewed
            </button>
            <button
              className="rounded bg-zinc-400 px-2 py-1 text-white"
              onClick={() => setSelectedIds([])}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {paged.map(([group, list]) => (
        <div key={group as string}>
          <h3 className="mb-2 mt-6 text-lg font-semibold text-zinc-600 dark:text-zinc-300">
            {group as string}
          </h3>
          <div className="grid gap-4">
            {(list as DashboardSession[]).map((session) => {
              const severityPercentages = getSeverityBreakdown([
                { label: "Low", count: session.severity_counts.low },
                { label: "Medium", count: session.severity_counts.medium },
                { label: "High", count: session.severity_counts.high },
              ]).map((item) => ({
                ...item,
                emoji: severityEmojiMap[item.label] || "",
                percentage: item.percent,
              }));
              return (
                <div
                  key={session.id}
                  className="rounded border p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-800"
                  data-tooltip-id={`tooltip-${session.id}`}
                  data-tooltip-content={session.summary || "No summary available."}
                >
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleSelected(session.id)}>
                      {selectedIds.includes(session.id) ? (
                        <CheckSquare className="text-blue-600" size={18} />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>
                    <div className="mb-1 text-lg font-semibold text-zinc-800 dark:text-white">
                      {session.title || "Untitled session"}
                    </div>
                  </div>
                  <div className="text-xs text-zinc-500">
                    Client: {session.client_email} | Started:{" "}
                    {new Date(session.created_at).toLocaleString()}
                  </div>
                  <div className="mt-2 text-sm text-blue-600">
                    {session.annotation_count} flagged annotations
                  </div>
                  {session.annotation_count > 0 && (
                    <div className="mt-2 space-y-2">
                      <div className="flex gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                        {session.severity_counts.high > 0 && (
                          <span className="text-red-600">
                            🔴 {session.severity_counts.high} High
                          </span>
                        )}
                        {session.severity_counts.medium > 0 && (
                          <span className="text-yellow-600">
                            🟡 {session.severity_counts.medium} Medium
                          </span>
                        )}
                        {session.severity_counts.low > 0 && (
                          <span className="text-green-600">
                            🟢 {session.severity_counts.low} Low
                          </span>
                        )}
                      </div>
                      <div
                        className="mt-1 flex h-2 overflow-hidden rounded"
                        data-tooltip-id={`severity-tooltip-${session.id}`}
                        data-tooltip-content={severityPercentages
                          .map((p) => `${p.emoji} ${p.label} – ${p.percentage}%`)
                          .join("\\n")}
                      >
                        {severityPercentages.map((p, i) => (
                          <div
                            key={i}
                            className="h-full"
                            style={{
                              width: `${p.percentage}%`,
                              backgroundColor: getEmotionColor(p.label),
                            }}
                          />
                        ))}
                      </div>
                      <Tooltip id={`severity-tooltip-${session.id}`} />
                      <div className="text-xs text-zinc-400">
                        {session.reviewed ? "✅ Reviewed" : "🕒 Not Reviewed"}
                      </div>
                      <Bar
                        height={120}
                        options={{ responsive: true, plugins: { legend: { display: false } } }}
                        data={{
                          labels: ["Low", "Medium", "High"],
                          datasets: [
                            {
                              label: "Severity Count",
                              data: [
                                session.severity_counts.low,
                                session.severity_counts.medium,
                                session.severity_counts.high,
                              ],
                              backgroundColor: ["#3b82f6", "#f59e0b", "#ef4444"],
                            },
                          ],
                        }}
                      />
                    </div>
                  )}
                  <Link
                    href={`/review/${session.id}`}
                    className="mt-4 inline-block rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
                  >
                    Review & Annotate
                  </Link>
                  <Tooltip id={`tooltip-${session.id}`} />
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {filtered.length > paged.flatMap(([, list]) => list as DashboardSession[]).length && (
        <button
          onClick={() => setPage((p) => p + 1)}
          className="mt-4 text-center text-sm text-blue-600 underline"
        >
          Load More
        </button>
      )}

      {filtered.length === 0 && (
        <div className="text-center text-zinc-400">
          <p>No matching sessions found.</p>
          <button className="mt-2 text-sm text-blue-600 underline" onClick={() => setSearch("")}>
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
