"use client";

import { useImperativeHandle, useEffect, useState, forwardRef, useMemo } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { format, differenceInDays } from "date-fns";
import Button from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { InviteLog } from "@/types/InviteLog";
import { RotateCw, ArrowDown, ArrowUp, RefreshCcw } from "lucide-react";
import debounce from "lodash/debounce";
import { Tooltip } from "react-tooltip";

export type InviteLogsListHandle = {
  refresh: () => void;
};

const InviteLogsList = forwardRef<InviteLogsListHandle, {}>((_, ref) => {
  const [invites, setInvites] = useState<InviteLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<keyof InviteLog>("created_at");
  const [sortAsc, setSortAsc] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const debouncedLoad = useMemo(
    () =>
      debounce(async () => {
        setRefreshing(true);
        const { data } = await supabase
          .from("invite_logs")
          .select("*")
          .order(sortBy || "created_at", { ascending: sortAsc });
        setInvites(data || []);
        setRefreshing(false);
        setLoading(false);
      }, 300),
    [sortBy, sortAsc]
  );

  useEffect(() => {
    setLoading(true);
    debouncedLoad();
    return () => debouncedLoad.cancel();
  }, [sortBy, sortAsc]);

  useImperativeHandle(ref, () => ({
    refresh: () => debouncedLoad(),
  }));

  const handleSort = (key: keyof InviteLog) => {
    if (sortBy === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortBy(key);
      setSortAsc(true);
    }
  };

  const handleResend = async (inviteId: string) => {
    setResendingId(inviteId);
    const res = await fetch("/api/admin-invite-therapist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_id: inviteId }),
    });
    setResendingId(null);
    if (res.ok) {
      toast.success("Invite resent successfully");
      debouncedLoad();
    } else {
      const err = await res.json();
      toast.error(`Resend failed: ${err.error}`);
    }
  };

  const handleBulkRetry = async () => {
    if (!selected.length) return;
    toast.loading("Retrying selected invites...");
    for (const id of selected) {
      await handleResend(id);
    }
    setSelected([]);
    toast.dismiss();
  };

  const SortIcon = ({ active }: { active: boolean }) =>
    active ? (
      sortAsc ? (
        <ArrowUp className="inline h-4 w-4" />
      ) : (
        <ArrowDown className="inline h-4 w-4" />
      )
    ) : null;

  if (loading) return <p>Loading invites...</p>;

  return (
    <div className="overflow-x-auto" id="invite-logs">
      <div className="mb-2 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        {refreshing && (
          <div className="flex items-center gap-1">
            <RefreshCcw className="h-4 w-4 animate-spin" />
            <span>Refreshing...</span>
          </div>
        )}
        {selected.length > 0 && (
          <>
            <span>{selected.length} selected</span>
            <Button onClick={handleBulkRetry} size="sm">
              Retry Selected
            </Button>
          </>
        )}
      </div>
      <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
        <thead>
          <tr className="text-left text-sm font-semibold text-zinc-700 dark:text-white">
            <th className="px-2">
              {invites.some((i) => i.status !== "accepted") && (
                <input
                  type="checkbox"
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? invites.filter((i) => i.status !== "accepted").map((i) => i.id)
                        : []
                    )
                  }
                  checked={selected.length === invites.length}
                />
              )}
            </th>
            <th className="cursor-pointer px-4 py-2" onClick={() => handleSort("to_email")}>
              Email <SortIcon active={sortBy === "to_email"} />
            </th>
            <th className="cursor-pointer px-4 py-2" onClick={() => handleSort("status")}>
              Status <SortIcon active={sortBy === "status"} />
            </th>
            <th className="cursor-pointer px-4 py-2" onClick={() => handleSort("created_at")}>
              Sent At <SortIcon active={sortBy === "created_at"} />
            </th>
            <th className="cursor-pointer px-4 py-2" onClick={() => handleSort("retry_count")}>
              Retry Count <SortIcon active={sortBy === "retry_count"} />
            </th>
            <th className="px-4 py-2">Actions</th>
          </tr>
        </thead>
        <tbody className="text-sm text-zinc-800 dark:text-zinc-200">
          {invites.map((invite) => {
            const createdAt = new Date(invite.created_at);
            const expired = differenceInDays(new Date(), createdAt) >= 7;
            const retryLimitReached = (invite.retry_count ?? 0) >= 3;
            const canResend =
              invite.status === "failed" ||
              (invite.status === "pending" && !retryLimitReached && expired);

            return (
              <tr key={invite.id} className="border-b dark:border-zinc-700">
                <td className="px-2">
                  {invite.status !== "accepted" && (
                    <input
                      type="checkbox"
                      checked={selected.includes(invite.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelected((prev) => [...prev, invite.id]);
                        } else {
                          setSelected((prev) => prev.filter((id) => id !== invite.id));
                        }
                      }}
                    />
                  )}
                </td>
                <td className="px-4 py-2">{invite.to_email}</td>
                <td className="px-4 py-2 capitalize">{invite.status}</td>
                <td
                  className="px-4 py-2"
                  title={`Sent on ${format(createdAt, "PPPp")}, Retry #${invite.retry_count}`}
                >
                  {format(createdAt, "yyyy-MM-dd HH:mm")}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-block cursor-help rounded px-2 py-1 text-xs font-medium ${
                      invite.last_error
                        ? "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
                        : retryLimitReached
                          ? "bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200"
                          : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
                    }`}
                    data-tooltip-id={`retry-${invite.id}`}
                    data-tooltip-content={[
                      `Retries: ${invite.retry_count}`,
                      `Last retry: ${invite.last_retry_at ? format(new Date(invite.last_retry_at), "yyyy-MM-dd HH:mm") : "—"}`,
                      invite.last_error ? `Last error: ${invite.last_error}` : null,
                    ]
                      .filter(Boolean)
                      .join("\n")}
                  >
                    {invite.retry_count}{" "}
                    {retryLimitReached ? "(Max)" : invite.last_error ? "⚠" : ""}
                  </span>
                  <Tooltip id={`retry-${invite.id}`} />
                </td>
                <td className="px-4 py-2">
                  {canResend ? (
                    <Button
                      onClick={() => handleResend(invite.id)}
                      disabled={resendingId === invite.id}
                      className="flex items-center gap-1"
                      title="Resend invite"
                    >
                      <RotateCw className="h-4 w-4" />
                      {resendingId === invite.id ? "Sending..." : "Resend"}
                    </Button>
                  ) : (
                    <span
                      className="text-xs text-gray-400"
                      title="Retry limit reached or not expired"
                    >
                      —
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

InviteLogsList.displayName = "InviteLogsList";
export default InviteLogsList;
