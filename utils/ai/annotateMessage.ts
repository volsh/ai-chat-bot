import { Annotation } from "@/types";
import { createSupabaseServerClient } from "../../libs/supabase";

export async function annotateMessage({
  supabase,
  source_id,
  source_type,
  therapist_id,
  corrected_emotion,
  corrected_tone,
  corrected_topic,
  corrected_intensity,
  severity,
  flag_reason,
  note,
}: {
  supabase: ReturnType<typeof createSupabaseServerClient>;
  source_id?: string;
  source_type?: string;
  therapist_id: string;
  corrected_emotion?: string;
  corrected_tone?: string;
  corrected_topic?: string;
  corrected_intensity?: number;
  severity?: "high" | "medium" | "low";
  flag_reason?: string;
  note?: string;
}) {
  if (process.env.NODE_ENV !== "production") {
    console.log("[annotateMessage]", {
      source_id,
      source_type,
      therapist_id,
      corrected_emotion,
      corrected_tone,
      severity,
      flag_reason,
      note,
    });
  }

  const { error } = await supabase.from("annotations").upsert(
    {
      source_id: source_id || null,
      source_type: source_type || null,
      therapist_id,
      corrected_emotion,
      corrected_tone,
      corrected_topic,
      corrected_intensity,
      severity,
      note,
      flag_reason,
      updated_at: new Date().toISOString(),
      updated_by: therapist_id,
      feedback_source: "manual",
    },
    {
      onConflict: "source_id,source_type,therapist_id",
    }
  );

  if (error) throw new Error(error.message);

  return { success: true };
}
