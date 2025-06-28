import { supabaseBrowserClient as supabase } from "@/libs/supabase";
import { sources } from "next/dist/compiled/webpack/webpack";

/**
 * Call emotion tagging endpoint with user input.
 */
export async function tagEmotion(source_id: string, onOptimisticUpdate?: (emotion: any) => void) {
  try {
    // Local optimistic estimate (optional: a placeholder emotion prediction)
    const optimisticEmotion = {
      emotion: "pending",
      intensity: 1,
      tone: "Neutral",
      topic: "Unknown",
      alignment_score: 0.0,
      source_id,
      created_at: new Date().toISOString(),
    };
    if (onOptimisticUpdate) onOptimisticUpdate(optimisticEmotion);

    const res = await fetch("/api/tag-emotion", {
      method: "POST",
      body: JSON.stringify({ source_id }),
      headers: { "Content-Type": "application/json" },
    });

    const json = await res.json();
    return json;
  } catch (err) {
    console.error("Tagging error:", err);
    throw new Error("Tagging error: " + err);
  }
}

/**
 * Fetch a single emotion log by message ID.
 */
export async function fetchEmotionLogsForMessage(messageId: string) {
  const { data, error } = await supabase
    .from("emotion_logs")
    .select("*")
    .eq("source_id", messageId)
    .single();

  if (error) {
    console.warn(`Emotion log not found for message ${messageId}`, error);
    return null;
  }

  return data;
}
