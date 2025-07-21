"use client";

import { useEffect, useState } from "react";
import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import MetricCard from "./MetricCard";
import WeeklyTrendLineChart from "./WeeklyTrendLineChart";
import SnapshotStatusBar from "./SnapshotStatusBar";
import InviteFailureBox from "./InviteFailureBox";

export default function AdminMetricsDashboard() {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    users: 0,
    therapists: 0,
    sessions: 0,
    flagged: 0,
    annotations: 0,
    snapshots: 0,
    retries: 0,
    invites: 0,
    failedInvites: 0,
  });

  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [snapshotStatusCounts, setSnapshotStatusCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const [
        { count: userCount },
        { count: therapistCount },
        { count: sessionCount },
        { count: flaggedCount },
        { count: annotationCount },
        { data: snapshotRows },
        { count: inviteCount },
        { count: failedInviteCount },
      ] = await Promise.all([
        supabase.from("users").select("*", { count: "exact", head: true }),
        supabase.from("users").select("*", { count: "exact", head: true }).eq("role", "therapist"),
        supabase.from("sessions").select("*", { count: "exact", head: true }),
        supabase
          .from("annotations")
          .select("*", { count: "exact", head: true })
          .eq("flagged", true),
        supabase.from("annotations").select("*", { count: "exact", head: true }),
        supabase.from("fine_tune_snapshots").select("retry_count, job_status"),
        supabase.from("invite_logs").select("*", { count: "exact", head: true }),
        supabase
          .from("invite_logs")
          .select("*", { count: "exact", head: true })
          .eq("status", "failed"),
      ]);

      const retries = snapshotRows?.reduce((sum, row) => sum + (row.retry_count || 0), 0);

      const snapshotStatus: Record<string, number> = {};
      snapshotRows?.forEach((s) => {
        const key = s.job_status || "unknown";
        snapshotStatus[key] = (snapshotStatus[key] || 0) + 1;
      });

      setMetrics({
        users: userCount || 0,
        therapists: therapistCount || 0,
        sessions: sessionCount || 0,
        flagged: flaggedCount || 0,
        annotations: annotationCount || 0,
        snapshots: snapshotRows?.length || 0,
        retries: retries || 0,
        invites: inviteCount || 0,
        failedInvites: failedInviteCount || 0,
      });
      setSnapshotStatusCounts(snapshotStatus);

      const { data: weekly } = await supabase.rpc("admin_weekly_trends");
      setWeeklyData(weekly || []);

      setLoading(false);
    };

    load();
  }, []);

  return (
    <div className="mt-6 space-y-8">
      <h2 className="text-xl font-bold">📊 Admin Metrics</h2>

      {loading ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading metrics…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <MetricCard label="Total Users" value={metrics.users} icon="👥" />
            <MetricCard label="Therapists Invited" value={metrics.invites} icon="🧑‍⚕️" />
            <MetricCard label="Sessions" value={metrics.sessions} icon="💬" />
            <MetricCard label="Flagged Messages" value={metrics.flagged} icon="🚩" />
            <MetricCard label="Annotations Reviewed" value={metrics.annotations} icon="📝" />
            <MetricCard label="Snapshots Created" value={metrics.snapshots} icon="🧠" />
            <MetricCard label="Snapshot Retries" value={metrics.retries} icon="🔁" />
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <WeeklyTrendLineChart data={weeklyData} />
            <SnapshotStatusBar statusCounts={snapshotStatusCounts} />
          </div>

          <div>
            <InviteFailureBox total={metrics.invites} failed={metrics.failedInvites} />
          </div>
        </>
      )}
    </div>
  );
}
