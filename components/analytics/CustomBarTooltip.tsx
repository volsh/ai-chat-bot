const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || payload.length === 0) return null;

  const entries = payload.filter((p: any) => p?.dataKey && p?.value > 0);
  if (!entries?.length) return null;

  const total = entries.reduce((acc: number, current: any) => {
    acc += current.value;
    return acc;
  }, 0);

  const emotionsData = entries.map((entry: any) => {
    const { dataKey: emotion, value, fill } = entry;
    const percent = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
    return { emotion, value, percent, fill };
  });

  return (
    <div className="rounded bg-white p-2 text-xs shadow">
      <div className="mb-1 font-semibold">Date: {label}</div>
      {emotionsData.map((emotionData: any, index: number) => (
        <div key={index} className="flex items-center justify-between gap-2">
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: emotionData.fill }} />
          <span className="flex-1 capitalize">{emotionData.emotion}</span>
          <span className="text-right">
            {emotionData.value.toFixed(2)} ({emotionData.percent}%)
          </span>
        </div>
      ))}
    </div>
  );
};

export default CustomBarTooltip;
