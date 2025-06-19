// utils/summarizeSession.ts
import { Message } from "@/types";

export async function summarizeSession(messages: Message[]): Promise<string> {
  const res = await fetch("/api/summarize-title", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to generate summary");

  return data.title || "No summary generated.";
}
