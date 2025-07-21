import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, LabelList } from "recharts";

export default function SnapshotStatusBar({
  statusCounts,
}: {
  statusCounts: Record<string, number>;
}) {
  const data = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

  return (
    <div className="rounded border bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <h3 className="mb-2 text-sm font-semibold">🧠 Snapshot Statuses</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <XAxis dataKey="status" stroke="#888" fontSize={12} />
          <YAxis allowDecimals={false} stroke="#888" fontSize={12} />
          <Tooltip />
          <Bar dataKey="count">
            <LabelList dataKey="count" position="top" />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
