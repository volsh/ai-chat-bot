import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend } from "recharts";

export default function WeeklyTrendLineChart({ data }: { data: any[] }) {
  return (
    <div className="rounded border bg-white p-4 dark:border-zinc-700 dark:bg-zinc-800">
      <h3 className="mb-2 text-sm font-semibold">📆 Weekly Users & Sessions</h3>
      <ResponsiveContainer width="100%" height={250}>
        <LineChart data={data}>
          <XAxis dataKey="week" stroke="#888" fontSize={12} />
          <YAxis allowDecimals={false} stroke="#888" fontSize={12} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="new_users" name="Users" stroke="#1f77b4" strokeWidth={2} />
          <Line
            type="monotone"
            dataKey="new_sessions"
            name="Sessions"
            stroke="#ff7f0e"
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
