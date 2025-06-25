"use client";

import { useEffect, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { useAppStore } from "@/state";
import { useSavedFilters } from "@/hooks/useSavedFilters";
import { ExportFilterOptions, FlaggedSession, MessageWithEmotion } from "@/types";
import Input from "@/components/ui/input";
import Select from "@/components/ui/select";
import MultiSelectFilter from "@/components/ui/multiSelectChips";
import DateRangePicker from "@/components/ui/dateRangePicker";
import SessionCard from "@/components/therapist/SessionCard";
import Tabs from "@/components/ui/tabs";
import { FileDown } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import Slider from "@/components/ui/slider";
import Toggle from "@/components/ui/toggle";
import CollapsibleSection from "@/components/ui/CollapsibleSection";
import AnnotationModal from "@/components/therapist/AnnotationModal";
import ClearFiltersButton from "@/components/ui/filters/ClearFiltersButton";
import { differenceInMilliseconds } from "date-fns";

export default function TherapistReviewPanel() {
  const { userProfile } = useAppStore(useShallow((s) => ({ userProfile: s.userProfile })));
  const [sessions, setSessions] = useState<FlaggedSession[]>([]);
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [sort, setSort] = useState<"newest" | "flags" | "intensity">("newest");
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [showAnnotations, setShowAnnotations] = useState(false);
  const [selectedMsg, setSelectedMsg] = useState<MessageWithEmotion | null>(null);
  const [showTopBtn, setShowTopBtn] = useState(false);

  const { filters, setFilter, resetFilters } = useSavedFilters<ExportFilterOptions>(
    "therapist_sessions_view_filters",
    {
      emotions: [] as string[],
      intensity: [0.1, 1] as [number, number],
      flagReasons: [] as string[],
      tones: [] as string[],
      startDate: "",
      endDate: "",
      highRiskOnly: false as boolean,
      agreement: [0, 100] as [number, number],
      flaggedOnly: false as boolean,
      messageRole: [] as string[],
    }
  );

  useEffect(() => {
    const onScroll = () => setShowTopBtn(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const loadSessions = async () => {
    if (!userProfile) return;
    const { data } = await supabase.rpc("list_flagged_sessions", {
      therapist_uuid: userProfile.id,
    });

    const grouped = new Map<string, FlaggedSession>();
    for (const row of data) {
      const existing =
        grouped.get(row.session_id) || ({ ...row, flagged_messages: [] } as FlaggedSession);
      existing.flagged_messages.push(row as MessageWithEmotion);
      grouped.set(row.session_id, existing);
    }
    setSessions([...grouped.values()]);
  };

  useEffect(() => {
    if (!userProfile) return;
    loadSessions().then(() => setLoading(false));
  }, [userProfile]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const filtered = sessions
    .filter((s) => {
      return (
        (tab === "all" ||
          (tab === "reviewed" && s.reviewed) ||
          (tab === "unreviewed" && !s.reviewed)) &&
        (s.client_email.toLowerCase().includes(query.toLowerCase()) ||
          s.client_name.toLowerCase().includes(query.toLowerCase())) &&
        (!filters.flagReasons?.length ||
          (s.top_reasons || []).some((r) => filters.flagReasons?.includes(r))) &&
        (!filters.agreement ||
          ((s.ai_agreement_rate ?? 0) >= filters.agreement[0] &&
            (s.ai_agreement_rate ?? 0) <= filters.agreement[1])) &&
        s.flagged_messages.some(
          (f) =>
            (!filters.flaggedOnly || f.flag_reason) &&
            (!filters.intensity ||
              ((f.intensity ?? 0) >= filters.intensity[0] &&
                (f.intensity ?? 0) <= filters.intensity[1])) &&
            (!filters.emotions?.length || (f.emotion && filters.emotions.includes(f.emotion))) &&
            (!filters.tones?.length || (f.tone && filters.tones.includes(f.tone))) &&
            (!filters.flagReasons?.length ||
              (f.flag_reason && filters.flagReasons.includes(f.flag_reason))) &&
            (!filters.highRiskOnly ||
              f.severity === "high" ||
              (f.tone === "negative" && f.intensity && f.intensity >= 0.8)) &&
            (!filters.startDate ||
              (f.annotation_updated_at && f.annotation_updated_at >= filters.startDate)) &&
            (!filters.endDate ||
              (f.annotation_updated_at && f.annotation_updated_at <= filters.endDate)) &&
            (!filters.messageRole?.length || filters.messageRole.includes(f.message_role!))
        )
      );
    })
    .sort((a, b) => {
      if (sort === "flags") return b.annotation_count - a.annotation_count;
      if (sort === "intensity") {
        const maxA = Math.max(...a.flagged_messages.map((f) => f.intensity || 0));
        const maxB = Math.max(...b.flagged_messages.map((f) => f.intensity || 0));
        return maxB - maxA;
      }
      const messageA = a.flagged_messages.sort((msg1, msg2) =>
        differenceInMilliseconds(
          new Date(msg1.message_created_at),
          new Date(msg2.message_created_at)
        )
      )[0];
      const messageB = b.flagged_messages.sort((msg1, msg2) =>
        differenceInMilliseconds(
          new Date(msg1.message_created_at),
          new Date(msg2.message_created_at)
        )
      )[0];

      return differenceInMilliseconds(
        new Date(messageA.message_created_at),
        new Date(messageB.message_created_at)
      );
    });

  const paginated = filtered.slice(0, page * 10);

  const handleExport = () => {
    const rows = filtered.map((s) => [
      s.session_title,
      s.client_email,
      s.annotation_count,
      s.severity_counts.low,
      s.severity_counts.medium,
      s.severity_counts.high,
      s.ai_agreement_rate,
      s.reviewed ? "Yes" : "No",
      s.session_created_at,
    ]);
    const csv = [
      [
        "Title",
        "Client Email",
        "Flags",
        "Low",
        "Medium",
        "High",
        "AI Agreement %",
        "Reviewed",
        "Created At",
      ],
      ...rows,
    ]
      .map((r) => r.join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "therapist_sessions.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Loading therapist data…</div>;
  }

  return (
    <div className="p-6">
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { value: "all", label: "All Sessions" },
          { value: "reviewed", label: "Reviewed" },
          { value: "unreviewed", label: "Unreviewed" },
        ]}
      />

      <CollapsibleSection title="Filters">
        <div className="flex flex-wrap items-center gap-4">
          <Input
            className="w-60"
            placeholder="Search…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <MultiSelectFilter
            label="Role"
            values={filters.messageRole || []}
            onChange={(v) => setFilter("messageRole", v)}
            options={["user", "assistant", "system"]}
          />
          <MultiSelectFilter
            label="Emotion"
            values={filters.emotions || []}
            onChange={(v) => setFilter("emotions", v)}
            options={[
              ...new Set(
                sessions.flatMap((s) => s.flagged_messages.flatMap((m) => m.emotion || []))
              ),
            ]}
          />
          <MultiSelectFilter
            label="Tone"
            values={filters.tones || []}
            onChange={(v) => setFilter("tones", v)}
            options={["positive", "neutral", "negative"]}
          />
          <Slider
            type="range"
            label="Intensity"
            min={0.1}
            max={1}
            step={0.1}
            value={[filters.intensity?.[0], filters.intensity?.[1]] as [number, number]}
            onChange={(v) => setFilter("intensity", v)}
          />
          <Slider
            type="range"
            label="Min Agreement %"
            min={0}
            max={100}
            value={[filters.agreement?.[0], filters.agreement?.[1]] as [number, number]}
            onChange={(v) => setFilter("agreement", v)}
          />
          <Toggle
            label="Flagged Only"
            checked={filters.flaggedOnly || false}
            onChange={(v) => setFilter("flaggedOnly", v)}
          />
          <Toggle
            label={
              <span className="inline-flex items-center gap-1">
                High Risk Only
                <span
                  className="cursor-help text-gray-400"
                  title="Only show messages marked with high severity"
                >
                  ⓘ
                </span>
              </span>
            }
            checked={filters.highRiskOnly || false}
            onChange={(v) => setFilter("highRiskOnly", v)}
          />
          <MultiSelectFilter
            label="Flag reason"
            values={filters.flagReasons || []}
            onChange={(v) => setFilter("flagReasons", v)}
            options={[...new Set(sessions.flatMap((s) => s.top_reasons || []))]}
          />
          <DateRangePicker
            value={{ from: filters.startDate!, to: filters.endDate! }}
            onChange={(value) => {
              setFilter("startDate", value.from);
              setFilter("endDate", value.to);
            }}
          />
          <Select
            label="Sort"
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            options={[
              { label: "Newest", value: "newest" },
              { label: "Most Flags", value: "flags" },
              { label: "By Max Intensity", value: "intensity" },
            ]}
          />
          <div className="self-end">
            <ClearFiltersButton onClick={resetFilters} />
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 border px-3 py-1 text-sm"
          >
            <FileDown size={16} /> Export CSV
          </button>
          <button
            onClick={async () => {
              if (selectedIds.length === 0) return;

              await Promise.all(
                selectedIds.map((id) =>
                  supabase.from("sessions").update({ reviewed: true }).eq("id", id)
                )
              );

              setSessions((prev) =>
                prev.map((s) => (selectedIds.includes(s.session_id) ? { ...s, reviewed: true } : s))
              );

              setSelectedIds([]);
            }}
            className="inline-flex items-center gap-2 border px-3 py-1 text-sm disabled:opacity-50"
            disabled={selectedIds.length === 0}
            title={selectedIds.length === 0 ? "No sessions selected" : ""}
          >
            ✅ Mark Selected Reviewed
          </button>
        </div>
      </CollapsibleSection>

      {paginated.map((session) => (
        <SessionCard
          key={session.session_id}
          session={session}
          selected={selectedIds.includes(session.session_id)}
          onToggle={() => toggleSelected(session.session_id)}
          showFlags={true}
          filterFlags={(m) => {
            const shouldShow =
              (!filters.flaggedOnly || m.flag_reason) &&
              (!filters.emotions?.length || filters.emotions.includes(m.emotion ?? "")) &&
              (!filters.tones?.length || filters.tones.includes(m.tone ?? "")) &&
              (!filters.intensity ||
                ((m.intensity ?? 0) >= filters.intensity[0] &&
                  (m.intensity ?? 0) <= filters.intensity[1])) &&
              (!filters.flagReasons?.length || filters.flagReasons.includes(m.flag_reason ?? "")) &&
              (!filters.highRiskOnly ||
                m.severity === "high" ||
                (m.tone === "negative" && m.intensity && m.intensity >= 0.8)) &&
              (!filters.startDate ||
                (m.annotation_updated_at && m.annotation_updated_at >= filters.startDate)) &&
              (!filters.endDate ||
                (m.annotation_updated_at && m.annotation_updated_at <= filters.endDate)) &&
              (!filters.messageRole?.length || filters.messageRole.includes(m.message_role!));

            return Boolean(shouldShow);
          }}
          onAnnotate={(msg) => {
            setSelectedMsg(msg);
            setShowAnnotations(true);
          }}
        />
      ))}

      {filtered.length > paginated.length && (
        <div className="mt-4 text-center">
          <button className="text-sm text-blue-600 underline" onClick={() => setPage((p) => p + 1)}>
            Load More
          </button>
        </div>
      )}

      {showAnnotations && selectedMsg && (
        <AnnotationModal
          sourceId={selectedMsg.source_id!}
          sourceType="session"
          initialAnnotation={selectedMsg}
          onClose={() => {
            setShowAnnotations(false);
            setSelectedMsg(null);
          }}
          onSaved={async () => {
            setShowAnnotations(false);
            setSelectedMsg(null);
            await loadSessions();
          }}
        />
      )}
      {showTopBtn && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-50 rounded-full bg-blue-600 px-4 py-2 text-sm text-white shadow hover:bg-blue-700"
        >
          ⬆ Top
        </button>
      )}
    </div>
  );
}
