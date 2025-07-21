"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import Link from "next/link";
import Input from "@/components/ui/input";
import Button from "@/components/ui/button";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { Session } from "@/types";
import startNewChat from "@/utils/chat/startNewChat";

const PAGE_SIZE = 12;

function SessionCardWithTimer({
  session,
  toggleBookmark,
}: {
  session: Session;
  toggleBookmark: (id: string, bookmarked: boolean) => void;
}) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const createdAt = new Date(session.created_at!);
  const endsAt = new Date(createdAt.getTime() + 2 * 60 * 60 * 1000);
  const isActive = now < endsAt && !session.ended_at;

  const timeLeft = Math.max(0, endsAt.getTime() - now.getTime());
  const minutes = Math.floor(timeLeft / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

  return (
    <div className="group relative rounded-lg border p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
      <h2 className="mb-1 text-lg font-semibold">{session.title}</h2>
      <p className="mb-1 text-xs text-gray-500 dark:text-gray-400">{createdAt.toLocaleString()}</p>

      {isActive ? (
        <p className="text-xs font-medium text-green-600 dark:text-green-400">
          🟢 Active — ends in {minutes}m {seconds}s
        </p>
      ) : (
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500">🔴 Session ended</p>
      )}

      {session.summary && (
        <p className="mt-2 line-clamp-3 text-sm text-gray-600 dark:text-gray-300">
          {session.summary}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between">
        <Link href={`/chat/${session.id}`} className="text-sm text-blue-600 underline">
          Open Chat →
        </Link>
        <button
          onClick={() => toggleBookmark(session.id!, !!session.bookmarked)}
          className="text-gray-400 hover:text-blue-500"
          aria-label="Toggle bookmark"
        >
          {session.bookmarked ? <BookmarkCheck size={18} /> : <Bookmark size={18} />}
        </button>
      </div>
    </div>
  );
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const { treatmentId } = useParams();
  const router = useRouter();

  useEffect(() => {
    const fetchSessions = async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .eq("treatment_id", treatmentId)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Failed to load sessions:", error);
      } else {
        setSessions(data || []);
      }
      setLoading(false);
    };
    if (treatmentId) fetchSessions();
  }, [treatmentId]);

  const filtered = useMemo(
    () => sessions.filter((s) => s.title?.toLowerCase().includes(query.toLowerCase())),
    [sessions, query]
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageData = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const toggleBookmark = async (id: string, bookmarked: boolean) => {
    const { error } = await supabase
      .from("sessions")
      .update({ bookmarked: !bookmarked })
      .eq("id", id);
    if (!error) {
      setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, bookmarked: !bookmarked } : s)));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sessions</h1>
        <Button
          variant="secondary"
          onClick={() => {
            router.push(`/treatments/`);
          }}
        >
          ← Back to Treatment
        </Button>
      </div>

      <div className="mt-4 flex justify-end">
        <Input
          placeholder="Search sessions..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="mb-6 max-w-sm"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {pageData.map((session) => (
          <SessionCardWithTimer
            key={session.id}
            session={session}
            toggleBookmark={toggleBookmark}
          />
        ))}
      </div>
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

      {/* If no results after filtering, just show a notice */}
      {pageData.length === 0 && sessions.length > 0 && (
        <p className="mt-8 text-center text-gray-400">No sessions match your search criteria.</p>
      )}

      {/* Show "Start New Session" if no sessions are active based on time logic */}
      {(sessions.length === 0 ||
        !sessions.some((s) => {
          const created = new Date(s.created_at).getTime();
          const paused = s.total_pause_seconds ? s.total_pause_seconds * 1000 : 0;
          const endsAt = created + 2 * 60 * 60 * 1000 + paused;
          return Date.now() < endsAt;
        })) && (
        <div className="mt-8 flex flex-col items-center justify-center gap-3 text-gray-400">
          <p>No active sessions found for this treatment. Get started by creating one!</p>
          <Button variant="primary" onClick={() => startNewChat(treatmentId as string)}>
            ➕ Start New Session
          </Button>
        </div>
      )}
    </div>
  );
}
