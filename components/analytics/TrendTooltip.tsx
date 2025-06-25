const TrendTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded bg-white p-2 text-xs shadow">
      <div className="mb-1 font-semibold">Date: {label}</div>
      {payload.map((line: any) => {
        const emotion = line.dataKey;
        const value = line.value;
        return (
          <div key={line.dataKey} className="flex items-center justify-between gap-2">
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: line.color }} />
            <span className="flex-1 capitalize">{emotion}</span>
            <span className="text-right">{value.toFixed(2)}</span>
          </div>
        );
      })}
    </div>
  );
};

export default TrendTooltip;
