import { Annotation } from "@/types";
import { createSupabaseServerClient } from "../../libs/supabase";

export async function annotateMessage({
  supabase,
  source_id,
  source_type,
  corrected_emotion,
  corrected_tone,
  corrected_topic,
  corrected_intensity,
  corrected_alignment_score,
  updated_by,
  flag_reason,
  note,
}: Partial<Annotation> & { supabase: ReturnType<typeof createSupabaseServerClient> }) {
  if (process.env.NODE_ENV !== "production") {
    console.log("[annotateMessage]", {
      source_id,
      source_type,
      corrected_emotion,
      corrected_tone,
      flag_reason,
      note,
    });
  }

  const { error } = await supabase.from("annotations").upsert(
    {
      source_id: source_id || null,
      source_type: source_type || null,
      corrected_emotion,
      corrected_tone,
      corrected_topic,
      corrected_intensity,
      corrected_alignment_score,
      note,
      flag_reason,
      updated_at: new Date().toISOString(),
      updated_by,
      feedback_source: "manual",
    }
  );

  if (error) throw new Error(error.message);

  return { success: true };
}
