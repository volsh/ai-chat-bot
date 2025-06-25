// pages/dashboard/therapist/clients.tsx

"use client";

import { useEffect, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import Input from "@/components/ui/input";
import { useAppStore } from "@/state";
import { useShallow } from "zustand/react/shallow";
import { TherapistClient } from "@/types/TherapistClient";
import { PostgrestError } from "@supabase/supabase-js";

export default function ClientListPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { userProfile } = useAppStore(useShallow((s) => ({ userProfile: s.userProfile })));

  useEffect(() => {
    const loadClients = async () => {
      if (!userProfile) return;
      setLoading(true);
      setError(false);
      try {
        const { data, error } = (await supabase.rpc("list_therapist_clients", {
          therapist_uuid: userProfile.id,
        })) as { data: TherapistClient[]; error: PostgrestError | null };
        if (error) throw error;
        const sorted = (data || []).sort((a, b) =>
          a.last_active && b.last_active ? +new Date(b.last_active) - +new Date(a.last_active) : 0
        );
        setClients(sorted);
      } catch (err) {
        console.error("Error loading clients:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    loadClients();
  }, [userProfile]);

  const filteredClients = clients.filter((c) =>
    c.email.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="mb-4">
        <Input
          placeholder="Search by email..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {loading && <p className="text-zinc-500">Loading clients…</p>}
      {error && <p className="text-red-500">Failed to load client list.</p>}

      {!loading && !error && (
        <div className="space-y-4">
          {filteredClients.map((client) => (
            <div key={client.id} className="flex gap-4 rounded border p-3 dark:border-zinc-700">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-300 text-sm font-semibold text-white dark:bg-zinc-600">
                {client.email[0]?.toUpperCase()}
              </div>
              <div>
                <div className="font-medium ">{client.email}</div>
                <div className="text-sm text-zinc-500">
                  Sessions: {client.session_count} — Last:{" "}
                  {client.last_active ? new Date(client.last_active).toLocaleString() : "N/A"}
                  <div className="mt-1 text-xs text-zinc-400">
                    Access: {client.access_type || "Unknown"}
                  </div>
                  <div className="mt-2 space-x-4">
                    <a
                      href={`/chat?client=${client.id}`}
                      className="text-sm text-blue-600 underline"
                    >
                      View Sessions
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {filteredClients.length === 0 && (
            <p className="text-zinc-500">No matching clients found.</p>
          )}
        </div>
      )}
    </div>
  );
}
