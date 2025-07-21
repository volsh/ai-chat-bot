export default function InviteFailureBox({ total, failed }: { total: number; failed: number }) {
  const rate = total > 0 ? ((failed / total) * 100).toFixed(1) : "0.0";

  return (
    <div className="rounded border bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <h3 className="text-sm font-semibold">📩 Invite Failure Rate</h3>
      <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        <div>
          Total Invites Sent: <strong>{total}</strong>
        </div>
        <div>
          Failed Invites: <strong className="text-red-500">{failed}</strong>
        </div>
        <div>
          Failure Rate: <strong>{rate}%</strong>
        </div>
      </div>
    </div>
  );
}
