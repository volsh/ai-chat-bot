export default function getSeverityCounts<T extends { severity: string }>(items: T[]) {
  const counts = { low: 0, medium: 0, high: 0 };

  for (const item of items) {
    if (item.severity === "low") counts.low++;
    else if (item.severity === "medium") counts.medium++;
    else if (item.severity === "high") counts.high++;
  }

  const total = counts.low + counts.medium + counts.high;

  const percentages = {
    low: total > 0 ? Math.round((counts.low / total) * 100) : 0,
    medium: total > 0 ? Math.round((counts.medium / total) * 100) : 0,
    high: total > 0 ? Math.round((counts.high / total) * 100) : 0,
  };

  return { counts, percentages };
}
