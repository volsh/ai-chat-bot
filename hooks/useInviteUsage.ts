// hooks/useInviteUsage.ts
import { useEffect, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";

export function useInviteUsage(teamId?: string) {
  const [usage, setUsage] = useState({ used: 0, limit: 10 });

  useEffect(() => {
    if (!teamId) return;

    const load = async () => {
      const { count } = await supabase
        .from("invite_logs")
        .select("id", { count: "exact", head: true })
        .eq("team_id", teamId)
        .eq("status", "pending")
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      setUsage({ used: count || 0, limit: 10 });
    };

    load();
  }, [teamId]);

  return usage;
}
