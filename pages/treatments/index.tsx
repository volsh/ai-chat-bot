"use client";

import { useState, useEffect, useMemo } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { useAppStore } from "@/state";
import TreatmentEditorModal from "@/components/treatment/TreatmentEditorModal";
import { format } from "date-fns";
import Button from "@/components/ui/button";
import { Plus, FolderOpen, Loader2 } from "lucide-react";
import { CheckCircle, PlayCircle, PauseCircle, ArchiveX } from "lucide-react";
import MultiSelectChips from "@/components/ui/multiSelectChips";
import ClearFiltersButton from "@/components/ui/filters/ClearFiltersButton";
import Input from "@/components/ui/input";

const PAGE_SIZE = 10;

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "active":
      return (
        <span className="flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
          <CheckCircle className="mr-1 h-3 w-3" />
          Active
        </span>
      );
    case "in_progress":
      return (
        <span className="flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
          <PlayCircle className="mr-1 h-3 w-3" />
          In Progress
        </span>
      );
    case "completed":
      return (
        <span className="flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
          <PauseCircle className="mr-1 h-3 w-3" />
          Completed
        </span>
      );
    default:
      return null;
  }
}

function ArchivedBadge({ isArchived }: { isArchived: boolean }) {
  if (!isArchived) return null;

  return (
    <span
      title="Archived treatment"
      className="flex items-center rounded-full bg-gray-300 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200"
    >
      📁 Archived
    </span>
  );
}

export default function TreatmentsPage() {
  const { session } = useAppStore();
  const [treatments, setTreatments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [search, setSearch] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [goalFilter, setGoalFilter] = useState<string[]>([]);
  const [selectedTreatmentId, setSelectedTreatmentId] = useState<string | null>(null);

  const loadTreatments = async () => {
    if (!session?.user?.id) return;

    const { data, error } = await supabase
      .from("treatments")
      .select("*, goal:goals(*)") // This joins the goal
      .order("created_at", { ascending: false });

    if (!error) {
      setTreatments(data ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTreatments();
  }, []);

  const goalOptions = useMemo(() => {
    const counts = treatments.reduce(
      (acc, t) => {
        const title = t.goal?.title || "No Goal";
        acc[title] = (acc[title] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
    return Object.entries(counts).map(([title, count]) => ({
      value: title,
      label: `${title} (${count})`,
    }));
  }, [treatments]);

  const filtered = useMemo(() => {
    return treatments.filter((t) => {
      const goalMatches = goalFilter.length
        ? goalFilter.includes(t.goal?.title || "No Goal")
        : true;

      const searchMatches = t.goal?.title?.toLowerCase().includes(search.toLowerCase()) || false;

      const archivedMatches = !!showArchived === t.archived;

      const statusMatches = statusFilter.length ? statusFilter.includes(t.status) : true;

      return goalMatches && archivedMatches && statusMatches && searchMatches;
    });
  }, [treatments, search, showArchived, statusFilter, goalFilter]);

  const statusCounts = useMemo(() => {
    return treatments.reduce(
      (acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );
  }, [treatments]);

  const statusOptions = [
    { value: "active", label: `Active (${statusCounts.active || 0})` },
    { value: "in_progress", label: `In Progress (${statusCounts.in_progress || 0})` },
    { value: "completed", label: `Completed (${statusCounts.completed || 0})` },
    { value: "archived", label: `Archived (${statusCounts.archived || 0})` },
  ];

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = useMemo(
    () => filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE),
    [filtered]
  );

  const handleBulkArchive = async (archived: boolean) => {
    if (!selected.length) return;

    const confirmed = window.confirm(
      `Are you sure you want to ${archived ? "archive" : "unarchive"} ${selected.length} treatments?`
    );
    if (!confirmed) return;

    const { error } = await supabase.from("treatments").update({ archived }).in("id", selected);
    if (error) {
      alert(error.message);
      return;
    }

    setTreatments((prev) => prev.map((t) => (selected.includes(t.id) ? { ...t, archived } : t)));
    setSelected([]);
  };

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Treatments</h1>
        {selected.length > 0 && (
          <div className="mt-2 flex justify-end gap-2">
            <Button variant="danger" onClick={() => handleBulkArchive(true)}>
              Archive Selected
            </Button>
            <Button variant="secondary" onClick={() => handleBulkArchive(false)}>
              Unarchive Selected
            </Button>
          </div>
        )}
        <Button variant="primary" onClick={() => setShowEditor(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Treatment
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search treatments..."
          className="rounded border border-gray-300 p-2 text-sm"
        />
        <MultiSelectChips
          label="Filter by Status"
          values={statusFilter}
          options={statusOptions}
          onChange={setStatusFilter}
          searchable
          scrollable
        />
        <MultiSelectChips
          label="Filter by Goal"
          values={goalFilter}
          options={goalOptions}
          onChange={setGoalFilter}
          searchable
          scrollable
        />

        <Button
          variant={showArchived ? "primary" : "secondary"}
          onClick={() => setShowArchived((prev) => !prev)}
        >
          {showArchived ? "Viewing Archived" : "Viewing Active"}
        </Button>
        <ClearFiltersButton
          onClick={() => {
            setSearch("");
            setStatusFilter([]);
            setShowArchived(false);
            setGoalFilter([]);
          }}
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      ) : pageData.length > 0 ? (
        <div className="mt-4 space-y-3">
          {pageData.map((t) => (
            <div
              key={t.id}
              className={`flex items-center justify-between rounded-lg border p-4 transition hover:shadow-lg ${t.archived ? "bg-gray-100 dark:bg-gray-800" : ""}`}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={selected.includes(t.id)}
                  onChange={(e) =>
                    setSelected((prev) =>
                      e.target.checked ? [...prev, t.id] : prev.filter((id) => id !== t.id)
                    )
                  }
                />
                <div>
                  <div className="flex items-center gap-2">
                    {t.goal && <div className="text-lg font-semibold">{t.goal.title}</div>}
                    {t.archived ? (
                      <ArchivedBadge isArchived={t.archived} />
                    ) : (
                      <StatusBadge status={t.status} />
                    )}
                  </div>

                  <div className="text-sm text-gray-500">
                    Created: {format(new Date(t.created_at), "MMM dd, yyyy HH:mm")}
                  </div>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={() => {
                  window.location.href = `/treatments/${t.id}/sessions`;
                }}
              >
                <FolderOpen className="mr-2 h-4 w-4" />
                View Sessions
              </Button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTreatmentId(t.id);
                }}
                title="Edit Treatment"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ⋯
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-8 text-center text-gray-500">
          No treatments found. Create one to get started.
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2 text-sm">
          <Button
            variant="secondary"
            disabled={page === 0}
            onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
          >
            Prev
          </Button>
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <Button
            variant="secondary"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((prev) => Math.min(prev + 1, totalPages - 1))}
          >
            Next
          </Button>
        </div>
      )}

      {(showEditor || selectedTreatmentId) && (
        <TreatmentEditorModal
          onClose={() => {
            showEditor ? setShowEditor(false) : setSelectedTreatmentId(null);
          }}
          onRefresh={loadTreatments}
          treatmentId={selectedTreatmentId!}
        />
      )}
    </div>
  );
}
