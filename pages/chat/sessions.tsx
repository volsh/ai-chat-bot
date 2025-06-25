import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import Link from "next/link";
import Input from "@/components/ui/input";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { Session } from "@/types";

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchSessions = async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) console.error("Failed to load sessions:", error);
      else setSessions(data || []);
    };

    fetchSessions();
  }, []);

  const toggleBookmark = async (id: string, bookmarked: boolean) => {
    const { error } = await supabase
      .from("sessions")
      .update({ bookmarked: !bookmarked })
      .eq("id", id);

    if (!error) {
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, bookmarked: (!bookmarked).toString() } : s))
      );
    }
  };

  const filtered = sessions.filter((s) => s.title?.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold">Your Sessions</h1>
      <Input
        placeholder="Search sessions..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-6 max-w-sm"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {filtered.map((session) => (
          <div
            key={session.id}
            className="group relative rounded-lg border p-4 shadow-sm dark:border-zinc-700 dark:bg-zinc-900"
          >
            <h2 className="mb-1 text-lg font-semibold ">
              {session.title}
            </h2>
            <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
              {new Date(session.created_at!).toLocaleString()}
            </p>
            {session.summary && (
              <p className="mb-2 line-clamp-3 text-sm text-gray-600 dark:text-gray-300">
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
        ))}
      </div>
      {filtered.length === 0 && (
        <p className="mt-8 text-center text-gray-400">No sessions found.</p>
      )}
    </div>
  );
}
