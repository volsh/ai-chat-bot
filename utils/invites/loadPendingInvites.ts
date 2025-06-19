// utils/invites/loadPendingInvites.ts
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { useState } from "react";

const PAGE_SIZE = 10;

export async function loadPendingInvites(inviterId: string, initialPage: number = 0) {
  const [page, setPage] = useState(initialPage);
  const { data, error, count } = await supabase
    .from("invite_logs")
    .select("*", { count: "exact" })
    .eq("inviter_id", inviterId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

  if (error) throw new Error(error.message);

  setPage((prev) => prev + 1);

  return {
    invites: data,
    hasMore: count ? (page + 1) * PAGE_SIZE < count : false,
  };
}
