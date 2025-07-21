export default function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon?: string;
}) {
  return (
    <div className="rounded-lg border bg-white p-4 shadow dark:border-zinc-700 dark:bg-zinc-800">
      <div className="text-sm text-zinc-500 dark:text-zinc-300">{label}</div>
      <div className="mt-2 flex items-center justify-between">
        <div className="text-2xl font-bold text-zinc-800 dark:text-white">{value}</div>
        {icon && <span className="text-2xl">{icon}</span>}
      </div>
    </div>
  );
}
