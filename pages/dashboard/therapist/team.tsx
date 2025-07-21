import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import Button from "@/components/ui/button";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InviteLog, Team, TeamMemberWithUsers } from "@/types";
import toast from "react-hot-toast";
import { Trash2 } from "lucide-react";
import Modal from "@/components/ui/modal";
import clsx from "clsx";
import { CheckCircle, Clock, RefreshCcw } from "lucide-react";
import Badge from "@/components/ui/badge";
import RetryCountFilter from "@/components/RetryCountFilter";
import Spinner from "@/components/ui/spinner";
import { loadPendingInvites } from "@/utils/invites/loadPendingInvites";
import { removeInvite } from "@/utils/invites/removeInvite";
import { debounce } from "lodash-es";
import { useAppStore } from "@/state";
import SearchUsers, { UserOption } from "@/components/SearchUsers";
import validator from "validator";
import { useInviteUsage } from "@/hooks/useInviteUsage";
import TeamMembersList from "@/components/therapist/TeamMembersList";

const MAX_RETRY_COUNT = 3;

const InviteStatus = ["all", "pending", "accepted", "expired"] as const;

type InviteStatusType = (typeof InviteStatus)[number];
const getInviteExpiry = (createdAt: string) => {
  const created = new Date(createdAt);
  return new Date(created.getTime() + 7 * 86400 * 1000);
};

const isExpiringSoon = (createdAt: string) => {
  const expires = getInviteExpiry(createdAt);
  const now = new Date();
  const diffMs = expires.getTime() - now.getTime();
  return diffMs > 0 && diffMs < 24 * 60 * 60 * 1000; // less than 1 day left
};

const getTooltip = (log: InviteLog) => {
  const expires = getInviteExpiry(log.created_at);
  const isExpired = expires < new Date();
  const count = log.retry_count || 0;

  let tip = `Resend limit: ${MAX_RETRY_COUNT} (${count} used)`;
  if (isExpired) tip += ` — Invite expired after 7 days`;

  return tip;
};

export default function TherapistTeam() {
  const [team, setTeam] = useState<Team | null>(null);
  const [loadingTeam, setLoadingTeam] = useState(true);
  const [members, setMembers] = useState<TeamMemberWithUsers[]>([]);
  const [loadingMoreInvites, setLoadingMoreInvites] = useState(false);
  const [hasMoreInvites, setHasMoreInvites] = useState(true);
  const [inviteLogs, setInviteLogs] = useState<InviteLog[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<{ userId: string; name: string } | null>(null);
  const [resending, setResending] = useState<string | null>(null);
  const [retryThreshold, setRetryThreshold] = useState(0);
  const [logFilter, setLogFilter] = useState<InviteStatusType>("all");
  const [loadingInvites, setLoadingInvites] = useState(false);
  const pageRef = useRef(0);

  const teamId = team?.id;

  const userProfile = useAppStore((s) => s.userProfile);
  const userId = userProfile?.id;

  const inviteUsage = useInviteUsage(team?.id);

  useEffect(() => {
    const loadTeam = async () => {
      if (!userId) return;
      setLoadingTeam(true);

      const { data: member, error } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        toast.error("Failed to load user team membership");
      }

      if (member) {
        const { data: team, error } = await supabase
          .from("teams")
          .select("*")
          .eq("id", member.team_id)
          .maybeSingle();

        if (error) {
          toast.error("Failed to load team information");
        }

        if (team) {
          setTeam(team);
        }

        const { data: members } = await supabase
          .from("team_members")
          .select("*, users(id, full_name, email, role, avatar_url, short_description)")
          .eq("team_id", team.id);

        const roleOrder = ["admin", "manager", "member"];

        if (members) {
          members.sort((a, b) => {
            const roleIndexA = roleOrder.indexOf(a.role);
            const roleIndexB = roleOrder.indexOf(b.role);

            if (roleIndexA === -1) return 1;
            if (roleIndexB === -1) return -1;

            return roleIndexA - roleIndexB;
          });
        }
        setMembers(members || []);
      }
      setLoadingTeam(false);
    };
    loadTeam();
  }, [userId]);

  const loadInviteLogs = useCallback(
    async ({ reset = false }: { reset?: boolean } = {}) => {
      if (!userId) return;
      if (reset) {
        pageRef.current = 0;
        setInviteLogs([]);
        setHasMoreInvites(true);
      }
      const page = pageRef.current;
      const PAGE_SIZE = 10;
      setLoadingInvites(true);
      let query = supabase
        .from("invite_logs")
        .select("id, to_email, created_at, status, retry_count, accepted_at")
        .eq("inviter_id", userId)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (logFilter === "expired") {
        query = query.lt("created_at", new Date(Date.now() - 7 * 86400 * 1000).toISOString());
      } else if (logFilter !== "all") {
        query = query.eq("status", logFilter);
      }
      query = query.gte("retry_count", retryThreshold);

      const { data, error } = await query;
      setLoadingInvites(false);
      if (error) {
        toast.error(`Failed to fetch invites: ${error.message}`);
        return;
      }
      if (data.length < PAGE_SIZE) setHasMoreInvites(false);
      if (!reset) pageRef.current++;
      setInviteLogs((prev) =>
        reset ? (data as InviteLog[]) : [...prev, ...(data as InviteLog[])]
      );
    },
    [userId, logFilter, retryThreshold]
  );

  const debouncedLoadInvites = useMemo(
    () => debounce(() => loadInviteLogs({ reset: true }), 300),
    [loadInviteLogs]
  );

  useEffect(() => {
    debouncedLoadInvites();
    return () => debouncedLoadInvites.cancel();
  }, [debouncedLoadInvites]);

  const sendInvite = async (email: string) => {
    if (!team?.id || !email) return;
    if (!validator.isEmail(email)) return toast.error("Invalid email");
    if (
      inviteLogs.some(
        (invite) =>
          invite.to_email.toLowerCase().trim() === email.toLowerCase().trim() &&
          invite.status === "pending"
      )
    )
      return toast.error("An invite for this user is already pending.");

    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, team_id: team.id }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Invite sent successfully");
        loadInviteLogs({ reset: true });
      } else {
        toast.error(result.error || "Failed to send invite");
      }
    } catch (err) {
      toast.error("Failed to send invite");
    }
    // setSelectedUser(null);
  };

  const resendInvite = async (log: InviteLog) => {
    if (!team?.id || !log.to_email) return;
    setResending(log.id);
    try {
      const res = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: log.to_email, team_id: team.id }),
      });
      const result = await res.json();
      if (result.success) {
        toast.success("Invite resent.");
        loadInviteLogs({ reset: true });
      } else {
        toast.error(result.error || "Failed to resend invite.");
      }
    } finally {
      setResending(null);
    }
  };

  const confirmAndRemoveTeamMember = async () => {
    if (!teamId || !confirmRemove) return;
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", confirmRemove.userId);
    if (!error) {
      setMembers((prev) => prev.filter((m) => m.user_id !== confirmRemove.userId));
      toast.success(`Removed ${confirmRemove.name}`);
    }
    setConfirmRemove(null);
  };

  async function loadMoreInvites() {
    if (!userId) return;
    setLoadingMoreInvites(true);
    const { invites, hasMore } = await loadPendingInvites(userId);
    if (!invites) {
      toast.error("Failed to load more invites");
      setLoadingMoreInvites(false);
      return;
    }
    if (!hasMore) setHasMoreInvites(false);
    setLoadingMoreInvites(false);
    setInviteLogs((prev) => [...prev, ...invites]);
  }

  const handleRevokeInvite = async (id: string) => {
    try {
      await removeInvite(id);
      setInviteLogs((prev) => prev.filter((i) => i.id !== id));
      toast.success("Invite revoked");
    } catch (err: any) {
      toast.error(err.message || "Failed to revoke invite");
    }
  };

  if (!loadingTeam && !team) {
    return <p className="text-sm text-zinc-500">No teams were found</p>;
  }

  const limitReached = inviteUsage.used >= inviteUsage.limit;

  return (
    <>
      {loadingTeam ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="rounded border p-4 shadow-sm dark:border-zinc-700">
            <div className="text-xl font-semibold">{team?.name}</div>
            <div className="text-zinc-600 dark:text-zinc-300">{team?.description}</div>
          </div>

          <div className="rounded border p-4 shadow-sm dark:border-zinc-700">
            <div className="flex items-center gap-2">
              <SearchUsers
                onSelect={(user: UserOption | null) => {
                  if (!user) return;
                  setSelectedUser(user);
                }}
                allowCustom
                label="Search user"
                value={selectedUser?.value}
                disabled={limitReached}
              />
              <Button
                disabled={loadingInvites || !selectedUser || limitReached}
                onClick={() => {
                  sendInvite(selectedUser?.label!);
                }}
              >
                Send Invite
              </Button>
            </div>
          </div>
          <div className="text-sm">
            <Badge variant="outline">
              🕒 {inviteUsage.used}/{inviteUsage.limit} invites today
            </Badge>
            {limitReached && <p className="text-xs text-red-500">Daily invite limit reached.</p>}
          </div>

          <div className="rounded border p-4 shadow-sm dark:border-zinc-700">
            <h3 className="mb-2 text-lg font-semibold">Team Members</h3>
            {members.length === 0 && (
              <p className="text-sm text-zinc-500">No team members found.</p>
            )}
            <TeamMembersList
              members={members}
              setConfirmRemove={setConfirmRemove}
              userId={userId!}
            />
            <h3 className="mt-4 text-sm font-semibold">Recent Invites:</h3>
            <div className="my-2 flex gap-2 text-xs">
              {InviteStatus.map((status) => (
                <button
                  key={status}
                  onClick={() => setLogFilter(status as InviteStatusType)}
                  className={`rounded border px-2 py-1 text-xs ${
                    logFilter === status
                      ? "border-blue-400 bg-blue-100 text-blue-700"
                      : "border-zinc-300 dark:border-zinc-600"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
              <div className="ml-2">
                {" "}
                <RetryCountFilter value={retryThreshold} onChange={setRetryThreshold} />
              </div>
            </div>
            <ul className="text-xs text-zinc-600 dark:text-zinc-400">
              {inviteLogs.map((log) => {
                const isAccepted = log.status === "accepted";
                const created = new Date(log.created_at);
                const accepted = new Date(log.accepted_at);
                const expires = getInviteExpiry(log.created_at);
                const isExpired = expires < new Date() && !isAccepted;
                const expiringSoon = isExpiringSoon(log.created_at);

                return (
                  <li key={log.id} className="flex items-center justify-between border-b pb-1">
                    <div>
                      <div>
                        <strong>{log.to_email}</strong>{" "}
                        {isAccepted && <CheckCircle className="inline text-green-500" size={12} />}
                        {isExpired && <span className="ml-1 text-red-500">(expired)</span>}
                        {expiringSoon && (
                          <span className="ml-2 font-medium text-orange-500">
                            (expiring soon ⏳)
                          </span>
                        )}
                        {log.status === "pending" && !isExpired && !expiringSoon && (
                          <Clock className="inline text-yellow-500" size={12} />
                        )}
                      </div>
                      <div className="text-[10px]">
                        Sent: {created.toLocaleString()} |{" "}
                        <>
                          {isAccepted ? (
                            <span>Accepted: {accepted.toLocaleDateString()} </span>
                          ) : (
                            <>Expires: {expires.toLocaleDateString()}</>
                          )}
                        </>
                      </div>
                    </div>
                    {isExpired && (
                      <button
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-blue-500 disabled:opacity-50"
                        onClick={() => resendInvite(log)}
                        disabled={log.retry_count >= MAX_RETRY_COUNT || resending === log.id}
                        title={getTooltip(log)}
                      >
                        <RefreshCcw size={12} /> Resend
                      </button>
                    )}
                    {log.status === "pending" && !isExpired && (
                      <Button variant="danger" size="sm" onClick={() => handleRevokeInvite(log.id)}>
                        Revoke
                      </Button>
                    )}
                    <Badge
                      className={clsx(
                        "ml-2",
                        log.retry_count >= MAX_RETRY_COUNT
                          ? "border-red-400 bg-red-100 text-red-800"
                          : log.retry_count > 0
                            ? "border-yellow-400 bg-yellow-100 text-yellow-800"
                            : "border-zinc-400 bg-zinc-100 text-zinc-800"
                      )}
                      variant="outline"
                    >
                      Retries: {log.retry_count || 0}
                    </Badge>
                  </li>
                );
              })}
            </ul>
            {hasMoreInvites && (
              <div className="mt-4">
                <Button onClick={loadMoreInvites} disabled={loadingMoreInvites}>
                  {loadingMoreInvites ? <Spinner size={10} /> : "Load More"}
                </Button>
              </div>
            )}
            {!inviteLogs.length && !loadingInvites && (
              <p className="text-sm text-gray-500">
                No {logFilter === "all" ? "" : logFilter} invites
              </p>
            )}
          </div>
          {confirmRemove && (
            <Modal onClose={() => setConfirmRemove(null)}>
              <div className="max-w-md rounded bg-white p-6 shadow-lg dark:bg-zinc-900">
                <h2 className="mb-2 text-lg font-semibold">Remove team member</h2>
                <p className="mb-4">
                  Are you sure you want to remove <strong>{confirmRemove.name}</strong>?
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setConfirmRemove(null)}>
                    Cancel
                  </Button>
                  <Button variant="danger" onClick={confirmAndRemoveTeamMember}>
                    Confirm
                  </Button>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}
    </>
  );
}
