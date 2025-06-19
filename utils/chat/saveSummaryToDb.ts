// utils/saveSummaryToDb.ts
export async function saveSummaryToDb(sessionId: string, summary: string) {
  const res = await fetch("/api/save-summary", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sessionId, summary }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error?.error || "Failed to save summary");
  }

  return await res.json();
}
